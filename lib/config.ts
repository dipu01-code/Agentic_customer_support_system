function requireEnv(key: string, fallback?: string) {
  const value = process.env[key] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export const appConfig = {
  appName: process.env.APP_NAME ?? "Agentic Customer Support System",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  adminDomain: process.env.ADMIN_DOMAIN ?? "adypu.edu.in",
  n8nChatWebhookUrl: process.env.N8N_CHAT_WEBHOOK_URL ?? "",
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL ?? "",
  n8nAdminWebhookUrl: process.env.N8N_ADMIN_WEBHOOK_URL ?? "",
  n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET ?? ""
};
