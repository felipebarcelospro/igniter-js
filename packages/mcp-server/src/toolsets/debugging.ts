/**
 * Debugging Tools - Runtime inspection and process interaction
 */
import { z } from "zod";
import { ToolsetContext } from "./types";
import CDP from 'chrome-remote-interface';
import { execSync } from 'child_process';

export function registerDebuggingTools({ server }: ToolsetContext) {
  server.registerTool("get_process_info", {
    title: "Get Process Info",
    description: "Gets detailed information about a running process by executing system commands (macOS and Linux compatible).",
    inputSchema: {
      process_id: z.number().describe("The PID of the process."),
    },
  }, async ({ process_id }: { process_id: number }) => {
    try {
      // Use process.kill with signal 0 to check for process existence without harming it.
      // This will throw an ESRCH error if the process doesn't exist.
      process.kill(process_id, 0);

      // Execute `ps` to get process details. The output is parsed carefully.
      // comm=name, command=full command, %cpu=cpu usage, rss=memory in KB, state=process status
      const psOutput = execSync(`ps -p ${process_id} -o comm=,command=,%cpu=,rss=,state=`).toString().trim();
      const parts = psOutput.split(/\s+/);

      if (parts.length < 5) {
        throw new Error("Failed to parse 'ps' command output.");
      }

      const name = parts[0];
      const state = parts[parts.length - 1];
      const rss = parseInt(parts[parts.length - 2], 10);
      const cpu_usage = parseFloat(parts[parts.length - 3]);
      const command = parts.slice(1, parts.length - 3).join(' ');

      // Execute `lsof` to find listening ports. Wrapped in try/catch as it can fail if no ports are open.
      let ports_in_use: number[] = [];
      try {
        const lsofOutput = execSync(`lsof -iTCP -sTCP:LISTEN -a -p ${process_id} | awk 'NR>1 {print $9}'`).toString().trim();
        if (lsofOutput) {
          ports_in_use = lsofOutput.split('\n')
            .map(line => parseInt(line.split(':').pop() || '', 10))
            .filter(port => !isNaN(port));
        }
      } catch (e) {
        // It's normal for a process to have no listening ports, so we ignore errors here.
      }

      // Map process state to a more readable format.
      const statusMap: { [key: string]: string } = {
        'R': 'running', 'S': 'sleeping', 'T': 'stopped', 'Z': 'zombie', 'I': 'idle'
      };

      return {
        content: [{
          type: "text", text: JSON.stringify({
            pid: process_id,
            name,
            command,
            cpu_usage,
            memory_usage: Math.round(rss / 1024), // Convert KB to MB
            ports_in_use,
            status: statusMap[state] || 'unknown',
          }, null, 2)
        }]
      };
    } catch (error: any) {
      if (error.code === 'ESRCH') {
        return { content: [{ type: "text", text: `Error: Process with PID ${process_id} not found.` }] };
      }
      if (error.code === 'EPERM') {
        return { content: [{ type: "text", text: `Error: Permission denied to get information for process ${process_id}.` }] };
      }
      return { content: [{ type: "text", text: `An unexpected error occurred: ${error.message}` }] };
    }
  });

  server.registerTool("inspect_runtime_variable", {
    title: "Inspect Runtime Variable",
    description: "Inspects the value of a variable in a running JavaScript/TypeScript process. The target process MUST be started with the --inspect flag.",
    inputSchema: {
      process_id: z.number().describe("The PID of the JavaScript/TypeScript process to inspect."),
      variable_name: z.string().describe("The name of the variable to inspect (must be in an accessible scope, preferably global)."),
      debug_port: z.number().optional().describe("The port where the debugger is listening. Defaults to 9229."),
      file_path: z.string().optional().describe("The path of the file where the variable is declared (to help with scope resolution in the future)."),
    },
  }, async ({ process_id, variable_name, debug_port = 9229 }: { process_id: number; variable_name: string; debug_port?: number; }) => {
    let client;
    try {
      // Verify the process exists before attempting to connect.
      process.kill(process_id, 0);

      client = await CDP({ port: debug_port });
      const { Runtime } = client;

      const result = await Runtime.evaluate({
        expression: variable_name,
        returnByValue: true, // Attempt to serialize the value
      });

      if (result.exceptionDetails) {
        const exception = result.exceptionDetails.exception;
        const errorMessage = exception?.description || "Variable not found or could not be accessed in the current scope.";
        return { content: [{ type: "text", text: `Error: ${errorMessage}` }] };
      }

      const value = result.result.value;
      return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };

    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        return { content: [{ type: "text", text: `Error: Connection refused on port ${debug_port}. Ensure the process with PID ${process_id} was started with the --inspect flag and is listening on the correct port.` }] };
      }
      if (error.code === 'ESRCH') {
        return { content: [{ type: "text", text: `Error: Process with PID ${process_id} not found.` }] };
      }
      return { content: [{ type: "text", text: `An unexpected error occurred: ${error.message}` }] };
    } finally {
      if (client) {
        await client.close();
      }
    }
  });

  server.registerTool("list_processes_on_port", {
    title: "List Processes on Port",
    description: "Lists all processes listening on or using a specific TCP/UDP port.",
    inputSchema: {
      port: z.number().describe("The TCP/UDP port to inspect (e.g., 3000, 9230)."),
      protocol: z.enum(["tcp", "udp"]).optional().describe("Filter by protocol. If not provided, searches for both."),
    },
  }, async ({ port, protocol }: { port: number; protocol?: "tcp" | "udp" }) => {
    if (port < 1 || port > 65535) {
      return { content: [{ type: "text", text: `Error: Invalid port number. Port must be between 1 and 65535.` }] };
    }

    try {
      const protocolFlag = protocol ? `-i${protocol.toUpperCase()}` : '-i';
      // -P: Prevents conversion of port numbers to service names
      // -n: Prevents conversion of network numbers to host names
      // -sTCP:LISTEN: Show only processes in LISTEN state for TCP
      const command = `lsof -i :${port} -P -n | awk 'NR>1'`;

      const output = execSync(command).toString().trim();

      if (!output) {
        return { content: [{ type: "text", text: `No processes found using port ${port}.` }] };
      }

      const processes = output.split('\n').map(line => {
        const parts = line.split(/\s+/);
        const [name, pid, user, _fd, _type, _device, _size, node] = parts;
        const addressInfo = parts.slice(8).join(' ');

        let local_address = '';
        let remote_address = '';
        let state = '';

        const listenMatch = addressInfo.match(/\(LISTEN\)/);
        if (listenMatch) {
          state = 'LISTEN';
          local_address = node;
        } else {
          const connectionMatch = addressInfo.match(/(.*)->(.*) \((.*)\)/);
          if (connectionMatch) {
            local_address = connectionMatch[1];
            remote_address = connectionMatch[2];
            state = connectionMatch[3];
          } else {
            local_address = node;
          }
        }

        return {
          pid: parseInt(pid, 10),
          name,
          command: name, // On macOS/lsof, getting the full command is tricky. Name is a good substitute.
          user,
          local_address,
          remote_address: remote_address || undefined,
          state: state || undefined,
        };
      });

      return { content: [{ type: "text", text: JSON.stringify(processes, null, 2) }] };
    } catch (error: any) {
      // `lsof` returns a non-zero exit code if no processes are found.
      // We check the error output to distinguish between "not found" and a real error.
      if (error.stderr && error.stderr.includes('No such file or directory')) {
         return { content: [{ type: "text", text: `No processes found using port ${port}.` }] };
      }
      return { content: [{ type: "text", text: `Failed to list processes: ${error.message}` }] };
    }
  });
}
