import { SEND_EMAIL_QUEUE_NAME } from "@/queues/email-queue";
import { type SendEmailSchema, sendEmailSchema } from "@/queues/schemas";
import { createWorker } from "@/queues/utils";
import { Job, Worker } from "bullmq";
import { connection } from "@/queues/configs";

// Regular email worker
export const emailWorker = createWorker<SendEmailSchema>(
  SEND_EMAIL_QUEUE_NAME,
  async (job) => {
    const { email, subject, text } = sendEmailSchema.parse(job.data);

    job.log(
      `Sending email to ${email} with subject ${subject} and text ${text}`,
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    job.log(`Email sent to ${email} with subject ${subject} and text ${text}`);

    return { email, subject, text };
  },
);

// Scheduled email worker
export const scheduledEmailWorker = new Worker(
  "scheduled-email-queue",
  async (job: Job<SendEmailSchema>) => {
    const { email, subject, text } = sendEmailSchema.parse(job.data);

    job.log(
      `Sending scheduled email to ${email} with subject ${subject} and text ${text}`,
    );

    await new Promise((resolve) => setTimeout(resolve, 5000));

    job.log(`Scheduled email sent to ${email} with subject ${subject} and text ${text}`);

    return { email, subject, text };
  },
  { connection }
);

// Event handlers for email worker
emailWorker.on("completed", (job) => {
  // eslint-disable-next-line no-console
  console.info(`Completed job ${job.id} - ${job.name}`);
});
emailWorker.on("failed", (job, err) => {
  console.error(`Failed job ${job?.id} - ${job?.name} with ${err}`);
});
emailWorker.on("error", (err) => {
  console.error(`Error ${err}`);
});

// Event handlers for scheduled email worker
scheduledEmailWorker.on("completed", (job) => {
  console.info(`Completed scheduled job ${job.id} - ${job.name}`);
});
scheduledEmailWorker.on("failed", (job, err) => {
  console.error(`Failed scheduled job ${job?.id} - ${job?.name} with ${err}`);
});
scheduledEmailWorker.on("error", (err) => {
  console.error(`Error in scheduled email worker: ${err}`);
});
