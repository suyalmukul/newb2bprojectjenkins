const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");

// Load .env file early if it exists
const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
  console.log("✓ Loaded environment variables from .env file");
} else {
  // Only load from default .env location if explicit path doesn't exist
  require("dotenv").config();
}

async function getSecrets(secretName) {
  try {
    // Check if environment variables are already loaded from .env
    if (process.env.MONGODB_URL) {
      console.log("✓ Using environment variables from .env file");
      return;
    }

    // Load from AWS Secrets Manager
    console.log(`Fetching secrets from AWS: ${secretName}`);
    
    const secretsManager = new AWS.SecretsManager({
      region: process.env.AWS_REGION || "ap-south-1",
    });
    
    const data = await secretsManager
      .getSecretValue({ SecretId: secretName })
      .promise();
    
    if (!data.SecretString) throw new Error("SecretString is empty");

    let secrets;
    try {
      secrets = JSON.parse(data.SecretString);
    } catch (error) {
      secrets = {};
      data.SecretString.split("\n").forEach((line) => {
        const index = line.indexOf("=");
        if (index !== -1) {
          const key = line.substring(0, index).trim();
          const value = line.substring(index + 1).trim();
          secrets[key] = value;
        }
      });
    }
    
    Object.keys(secrets).forEach((key) => {
      process.env[key] = secrets[key];
    });
    
    console.log(`✓ Secrets loaded successfully from: ${secretName}`);
  } catch (err) {
    console.error("Error retrieving secret from AWS:", err.message);
    
    // If AWS fails and no .env, throw error
    if (!process.env.MONGODB_URL) {
      throw new Error(
        "Unable to load secrets. Ensure one of the following:\n" +
        "1. EC2 instance has an IAM role with SecretsManager permissions\n" +
        "2. AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are set\n" +
        "3. ~/.aws/credentials file exists with valid credentials\n" +
        "4. .env file exists with MONGODB_URL and other required variables"
      );
    }
  }
}

module.exports = { getSecrets };
