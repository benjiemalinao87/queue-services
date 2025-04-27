import { supabase } from "../utils/supabase";

async function testAiResponseQueueAccess() {
  console.log("Testing access to ai_response_queue table...");
  
  try {
    // Test table exists and we can query it
    const { data, error, count } = await supabase
      .from("ai_response_queue")
      .select("*", { count: "exact" })
      .limit(5);

    if (error) {
      console.error("Error accessing ai_response_queue table:", error);
      return;
    }

    console.log(`Successfully accessed ai_response_queue table. Found ${count} records.`);
    
    if (data && data.length > 0) {
      console.log("Sample record:", JSON.stringify(data[0], null, 2));
      
      // Get table structure by inspecting first record
      console.log("Table structure:");
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        const value = data[0][col];
        const type = typeof value;
        console.log(`- ${col}: ${type} ${value === null ? '(nullable)' : ''}`);
      });
    } else {
      console.log("No records found in the table.");
    }

    // Test if we can query by status
    const { data: pendingData, error: pendingError, count: pendingCount } = await supabase
      .from("ai_response_queue")
      .select("*", { count: "exact" })
      .eq("status", "pending")
      .limit(3);

    if (pendingError) {
      console.error("Error querying pending records:", pendingError);
    } else {
      console.log(`Found ${pendingCount} pending records.`);
    }

  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

// Run the test
testAiResponseQueueAccess()
  .then(() => {
    console.log("Test completed.");
    process.exit(0);
  })
  .catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
  }); 