/**
 * @fileoverview Example: SQLite Adapter for Local Job Queues
 *
 * This example demonstrates how to use the SQLite adapter for job queue
 * management in local/desktop/CLI environments.
 *
 * Use cases:
 * - Desktop applications (Tauri, Electron)
 * - Command-line tools (CLIs)
 * - MCP Servers
 * - Local development
 * - Edge/embedded environments
 *
 * Run this example:
 *   npx tsx examples/sqlite-example.ts
 */

import { IgniterJobsSQLiteAdapter } from "../src/adapters/sqlite.adapter";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Create the SQLite adapter
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const adapter = IgniterJobsSQLiteAdapter.create({
    // Use a file for persistence (jobs survive process restarts)
    path: "./example-jobs.sqlite",
    // Polling interval for workers (in milliseconds)
    pollingInterval: 500,
    // Enable WAL mode for better concurrent performance
    enableWAL: true,
  });

  console.log("✅ SQLite adapter created");
  console.log(`   Database path: ./example-jobs.sqlite`);
  console.log("");

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Register job definitions
  // ─────────────────────────────────────────────────────────────────────────────

  // Simple job that sends a welcome email
  adapter.registerJob("email", "send-welcome", {
    handler: async ({ input }) => {
      const { email, name } = input as { email: string; name: string };
      console.log(`   📧 Sending welcome email to ${name} (${email})...`);

      // Simulate email sending
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log(`   ✅ Welcome email sent to ${email}`);
      return { sent: true, timestamp: new Date().toISOString() };
    },
    onStart: async ({ job }) => {
      console.log(`   🚀 Starting job: ${job.id}`);
    },
    onSuccess: async ({ job, result }) => {
      console.log(`   ✨ Job ${job.id} completed:`, result);
    },
    onFailure: async ({ job, error, isFinalAttempt }) => {
      console.log(`   ❌ Job ${job.id} failed: ${error.message}`);
      if (isFinalAttempt) {
        console.log(`   💀 No more retries for job ${job.id}`);
      }
    },
  });

  // Job that demonstrates retries
  adapter.registerJob("email", "send-notification", {
    handler: async ({ input, job }) => {
      const { userId, message } = input as { userId: string; message: string };

      // Simulate random failures for demonstration
      if (Math.random() < 0.3 && job.attemptsMade < 2) {
        throw new Error("Temporary network error");
      }

      console.log(`   📱 Notification sent to user ${userId}: "${message}"`);
      return { delivered: true };
    },
  });

  // Job with priority handling
  adapter.registerJob("processing", "analyze-data", {
    handler: async ({ input }) => {
      const { dataId, priority } = input as { dataId: string; priority: number };
      console.log(`   📊 Analyzing data ${dataId} (priority: ${priority})`);

      await new Promise((resolve) => setTimeout(resolve, 300));

      return { analyzed: true, dataId };
    },
  });

  console.log("✅ Job definitions registered:");
  console.log("   - email/send-welcome");
  console.log("   - email/send-notification");
  console.log("   - processing/analyze-data");
  console.log("");

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Create a worker to process jobs
  // ─────────────────────────────────────────────────────────────────────────────

  const worker = await adapter.createWorker({
    queues: ["email", "processing"],
    concurrency: 2,
    handlers: {
      onActive: ({ job }) => {
        console.log(`\n🔄 Processing: ${job.queue}/${job.name} (${job.id})`);
      },
      onSuccess: ({ job }) => {
        console.log(`✅ Completed: ${job.queue}/${job.name} (${job.id})\n`);
      },
      onFailure: ({ job, error }) => {
        console.log(`❌ Failed: ${job.queue}/${job.name} (${job.id}): ${error.message}\n`);
      },
      onIdle: () => {
        console.log("💤 Worker idle - waiting for jobs...\n");
      },
    },
  });

  console.log("✅ Worker created");
  console.log(`   Worker ID: ${worker.id}`);
  console.log(`   Queues: ${worker.queues.join(", ")}`);
  console.log(`   Running: ${worker.isRunning()}`);
  console.log("");

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Dispatch some jobs
  // ─────────────────────────────────────────────────────────────────────────────

  console.log("📤 Dispatching jobs...\n");

  // Welcome emails
  const job1 = await adapter.dispatch({
    queue: "email",
    jobName: "send-welcome",
    input: { email: "alice@example.com", name: "Alice" },
    priority: 5,
  });
  console.log(`   Dispatched: email/send-welcome (${job1})`);

  const job2 = await adapter.dispatch({
    queue: "email",
    jobName: "send-welcome",
    input: { email: "bob@example.com", name: "Bob" },
    priority: 10, // Higher priority - will run first
  });
  console.log(`   Dispatched: email/send-welcome (${job2}) [HIGH PRIORITY]`);

  // Notification with retries
  const job3 = await adapter.dispatch({
    queue: "email",
    jobName: "send-notification",
    input: { userId: "user_123", message: "Your report is ready!" },
    attempts: 3, // Retry up to 3 times
  });
  console.log(`   Dispatched: email/send-notification (${job3}) [3 retries]`);

  // Data processing jobs with different priorities
  for (let i = 1; i <= 3; i++) {
    const priority = i * 5;
    const jobId = await adapter.dispatch({
      queue: "processing",
      jobName: "analyze-data",
      input: { dataId: `data_${i}`, priority },
      priority,
    });
    console.log(`   Dispatched: processing/analyze-data (${jobId}) [priority: ${priority}]`);
  }

  // Delayed job (will execute after 3 seconds)
  const delayedJob = await adapter.dispatch({
    queue: "email",
    jobName: "send-welcome",
    input: { email: "delayed@example.com", name: "Delayed User" },
    delay: 3000,
  });
  console.log(`   Dispatched: email/send-welcome (${delayedJob}) [DELAYED 3s]`);

  console.log("");

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Monitor queue status
  // ─────────────────────────────────────────────────────────────────────────────

  console.log("📊 Queue Status:\n");

  const queues = await adapter.listQueues();
  for (const queue of queues) {
    console.log(`   ${queue.name}:`);
    console.log(`     Paused: ${queue.isPaused}`);
    console.log(`     Waiting: ${queue.jobCounts.waiting}`);
    console.log(`     Active: ${queue.jobCounts.active}`);
    console.log(`     Completed: ${queue.jobCounts.completed}`);
    console.log(`     Failed: ${queue.jobCounts.failed}`);
    console.log(`     Delayed: ${queue.jobCounts.delayed}`);
    console.log("");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Wait for jobs to complete
  // ─────────────────────────────────────────────────────────────────────────────

  console.log("⏳ Waiting for jobs to complete...\n");
  console.log("─────────────────────────────────────────────────────────────────");

  // Wait for all jobs to be processed
  await new Promise((resolve) => setTimeout(resolve, 8000));

  console.log("─────────────────────────────────────────────────────────────────");
  console.log("\n📊 Final Queue Status:\n");

  const finalQueues = await adapter.listQueues();
  for (const queue of finalQueues) {
    console.log(`   ${queue.name}:`);
    console.log(`     Completed: ${queue.jobCounts.completed}`);
    console.log(`     Failed: ${queue.jobCounts.failed}`);
    console.log("");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Worker metrics
  // ─────────────────────────────────────────────────────────────────────────────

  const metrics = await worker.getMetrics();
  console.log("📈 Worker Metrics:");
  console.log(`   Processed: ${metrics.processed}`);
  console.log(`   Failed: ${metrics.failed}`);
  console.log(`   Avg Duration: ${metrics.avgDuration.toFixed(2)}ms`);
  console.log(`   Uptime: ${(metrics.uptime / 1000).toFixed(2)}s`);
  console.log("");

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Cleanup
  // ─────────────────────────────────────────────────────────────────────────────

  console.log("🧹 Cleaning up...");

  // Close the worker
  await worker.close();
  console.log("   Worker closed");

  // Shutdown the adapter (closes database connection)
  await adapter.shutdown();
  console.log("   Adapter shutdown");

  console.log("");
  console.log("✅ Example completed!");
  console.log("");
  console.log("📁 The database file 'example-jobs.sqlite' was created.");
  console.log("   You can delete it or run this example again to see persistence in action.");
}

main().catch(console.error);
