const axios = require('axios');  // Import Axios
const { performance } = require('perf_hooks');  // To measure the time of execution

// API Endpoint (Replace with your actual API endpoint)
const apiUrl = 'http://localhost:3000/reconstruct/15';  // Replace with your Node API URL

// Configuration options for the load test
const NUM_REQUESTS = 1000;  // Number of requests to send
const CONCURRENT_REQUESTS = 10;  // Number of concurrent requests
const REQUEST_INTERVAL = 10;  // Delay between each batch of requests in milliseconds

// Function to make a single request to the API
const makeRequest = async (index) => {
  try {
    const startTime = performance.now(); // Start time for measuring the request duration
    const response = await axios.get(apiUrl);  // Sending a GET request
    const endTime = performance.now(); // End time
    const duration = endTime - startTime;  // Time taken for the request to complete
    console.log(`Request #${index} - Status: :${response.status} RESPONSE TIME: ${response.data['rt']} `);
  } catch (error) {
    console.error(`Request #${index} failed - Error: ${error.message}`);
  }
};

// Function to send multiple requests concurrently
const sendRequestsConcurrently = async () => {
  const requests = [];
  let completedRequests = 0;

  // Create a pool of concurrent requests
  for (let i = 0; i < NUM_REQUESTS; i++) {
    requests.push(
      makeRequest(i + 1).then(() => {
        completedRequests++;
        console.log(`Completed ${completedRequests} of ${NUM_REQUESTS} requests.`);
      })
    );

    // If we reach the limit of concurrent requests, wait for them to finish before starting more
    if (requests.length === CONCURRENT_REQUESTS) {
      await Promise.all(requests);
      requests.length = 0; // Reset the requests array for the next batch
      console.log(`Batch complete. Starting next batch of requests.`);
    }

    // Delay between each batch of requests
    if (i < NUM_REQUESTS - 1) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_INTERVAL));
    }
  }

  // Wait for the final batch of requests to complete
  if (requests.length > 0) {
    await Promise.all(requests);
    console.log(`All requests completed.`);
  }
};

// Start the load test
sendRequestsConcurrently().catch(err => {
  console.error('Error in load testing:', err);
});
