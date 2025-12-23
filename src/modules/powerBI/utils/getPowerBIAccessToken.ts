import axios from "axios";

const POWER_BI_SCOPE = "https://analysis.windows.net/powerbi/api/.default";
const DEFAULT_TENANT_ID = "fd4d8ce5-d6d4-4d37-8efa-cd345ae375a8";

export async function getPowerBIAccessToken(): Promise<string> {
  const {
    POWER_BI_CLIENT_ID,
    POWER_BI_USERNAME,
    POWER_BI_PASSWORD,
    POWER_BI_CLIENT_SECRET,
    POWER_BI_TENANT_ID,
  } = process.env;

  if (
    !POWER_BI_CLIENT_ID ||
    !POWER_BI_USERNAME ||
    !POWER_BI_PASSWORD ||
    !POWER_BI_CLIENT_SECRET
  ) {
    throw new Error("Missing Power BI credentials in environment variables");
  }

  const params = new URLSearchParams();
  params.append("client_id", POWER_BI_CLIENT_ID);
  params.append("scope", POWER_BI_SCOPE);
  params.append("username", POWER_BI_USERNAME);
  params.append("password", POWER_BI_PASSWORD);
  params.append("grant_type", "password");
  params.append("client_secret", POWER_BI_CLIENT_SECRET);

  const url = `https://login.microsoftonline.com/${POWER_BI_TENANT_ID ?? DEFAULT_TENANT_ID}/oauth2/v2.0/token`;

  const response = await axios.post(url, params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data.access_token;
}
