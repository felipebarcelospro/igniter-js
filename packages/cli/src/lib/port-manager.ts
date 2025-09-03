import { spawn } from "child_process";
import { logger } from "../adapters/logger";

/**
 * Kills processes using a specific port across different operating systems
 * @param port - The port number to free up
 */
export async function killProcessOnPort(port: number): Promise<void> {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';

  try {
    let command: string;
    let args: string[];

    if (isWindows) {
      // Windows: usar netstat e taskkill
      command = 'cmd';
      args = ['/c', `netstat -ano | findstr :${port} | findstr LISTENING`];
    } else if (isMac || isLinux) {
      // macOS/Linux: usar lsof
      command = 'lsof';
      args = ['-ti', `:${port}`];
    } else {
      logger.warn(`Unsupported platform: ${process.platform}. Skipping port cleanup.`);
      return;
    }

    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    await new Promise<void>((resolve) => {
      child.on('close', async (code) => {
        if (code === 0 && stdout.trim()) {
          // Encontrou processos usando a porta
          const pids = stdout.trim().split('\n').filter(line => line.trim());

          if (pids.length > 0) {
            logger.info(`Found ${pids.length} process(es) using port ${port}. Killing...`);

            for (const pid of pids) {
              try {
                if (isWindows) {
                  // No Windows, o PID está na última coluna do netstat
                  const parts = pid.trim().split(/\s+/);
                  const actualPid = parts[parts.length - 1];
                  spawn('taskkill', ['/PID', actualPid, '/F'], { stdio: 'inherit' });
                } else {
                  // macOS/Linux: matar processo diretamente
                  process.kill(parseInt(pid.trim()), 'SIGTERM');

                  // Aguardar um pouco e tentar SIGKILL se necessário
                  setTimeout(() => {
                    try {
                      process.kill(parseInt(pid.trim()), 'SIGKILL');
                    } catch (e) {
                      // Processo já foi morto ou não existe mais
                    }
                  }, 2000);
                }
              } catch (error) {
                logger.warn(`Failed to kill process ${pid}:`, error);
              }
            }

            // Aguardar um pouco para os processos terminarem
            await new Promise(resolve => setTimeout(resolve, 1000));
            logger.info(`Port ${port} freed successfully.`);
          }
        } else if (code !== 0 && stderr) {
          logger.debug(`Port check command failed (this is normal if no processes are using the port): ${stderr}`);
        }
        resolve();
      });
    });

  } catch (error) {
    logger.warn(`Failed to check/kill processes on port ${port}:`, error);
  }
}
