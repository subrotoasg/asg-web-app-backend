import { OAuth2Client } from "google-auth-library";
import config from "../config/index.js";
const google_client = new OAuth2Client(config.google_client_id);
export default google_client;
