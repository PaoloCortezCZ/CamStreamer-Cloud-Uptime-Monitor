import { Region, ServerGroup, FirewallRule } from './types';

export const FIREWALL_RULES: FirewallRule[] = [
  { port: 80, protocol: 'TCP', description: 'Standard HTTP web traffic' },
  { port: 443, protocol: 'TCP', description: 'Secure HTTPS web traffic' },
  { port: 8080, protocol: 'TCP', description: 'Alternative HTTP port' },
  { port: 123, protocol: 'UDP', description: 'NTP (Network Time Protocol)' },
];

export const SERVER_DATA: ServerGroup[] = [
  {
    region: Region.EU,
    coordinates: { lat: 50.0755, lng: 14.4378 }, // Prague
    servers: [
      { ip: '88.86.101.192/27', isRange: true },
      { ip: '46.234.125.128/27', isRange: true },
    ],
  },
  {
    region: Region.JP,
    coordinates: { lat: 35.6762, lng: 139.6503 }, // Tokyo
    servers: [
      { ip: '178.249.213.195' },
      { ip: '178.249.213.193' },
      { ip: '178.249.213.210' },
      { ip: '109.61.83.167' },
      { ip: '138.199.22.68' },
      { ip: '138.199.22.69' },
    ],
  },
  {
    region: Region.US,
    coordinates: { lat: 39.7392, lng: -104.9903 }, // Denver
    servers: [
      { ip: '121.127.44.20' },
      { ip: '121.127.44.79' },
      { ip: '121.127.44.104/30', isRange: true },
    ],
  },
  {
    region: Region.AXIS,
    coordinates: { lat: 55.7047, lng: 13.1910 }, // Lund, Sweden (Axis HQ approx)
    servers: [
      { ip: '52.51.189.141' },
      { ip: '18.200.145.9' },
      { ip: '54.73.167.187' },
      { ip: '3.24.72.55' },
      { ip: '18.215.224.182' },
      { ip: '195.60.68.120' },
      { ip: '195.60.68.121' },
    ],
  },
];

export const SYSTEM_INSTRUCTION = `
You are a technical support assistant for CamStreamer Cloud.
Your goal is to help users configure their firewalls and understand the network requirements for CamStreamer Cloud.

Here is the technical data you need to know:
1.  **Ports:**
    *   TCP: 8080, 80, 443
    *   UDP: 123 (NTP)
2.  **Regions & IPs:**
    *   **EU (Prague):** 88.86.101.192/27, 46.234.125.128/27
    *   **Japan (Tokyo):** 178.249.213.195, 178.249.213.193, 178.249.213.210, 109.61.83.167, 138.199.22.68, 138.199.22.69
    *   **USA (Denver):** 121.127.44.20, 121.127.44.79, 121.127.44.104/30
3.  **Axis Dispatchers (Initial Connection):**
    *   52.51.189.141, 18.200.145.9, 54.73.167.187, 3.24.72.55, 18.215.224.182, 195.60.68.120, 195.60.68.121

**Key Notes:**
*   Exceptions apply to **outgoing traffic only**.
*   Cameras connect using AVHS (Axis Video Hosting System) or O3C.
*   Initial connection goes to Axis Dispatchers to get certificates, then redirects to CamStreamer servers.

Answer concise and helpful responses. If a user asks about "Tokyo" IPs, list them. If they ask about ports, list them.
`;