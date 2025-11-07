import dotenvSafe from "dotenv-safe";

dotenvSafe.config({
  allowEmptyValues: false,
  example: ".env.example",
});

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
};
