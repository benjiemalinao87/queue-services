import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

// Create a Supabase client with the service role key for admin access
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to update job status in the ai_response_queue table
export const updateAIResponseJobStatus = async (
  jobId: string, 
  status: "pending" | "processing" | "complete" | "error" | "failed",
  updates: {
    attempts?: number,
    processed_at?: Date,
    error?: string
  } = {}
) => {
  const { data, error } = await supabase
    .from("ai_response_queue")
    .update({
      status,
      ...updates,
      ...(status === "processing" ? { attempts: supabase.rpc("increment", { row_id: jobId, increment_by: 1 }) } : {}),
      ...(status === "complete" || status === "error" || status === "failed" ? { processed_at: new Date().toISOString() } : {})
    })
    .eq("id", jobId)
    .select();

  if (error) {
    console.error(`Error updating job ${jobId} status to ${status}:`, error);
    throw error;
  }

  return data;
}; 