import * as icons from 'simple-icons';
import { mkdir, writeFile } from 'node:fs/promises';
const selected = ['Wordpress','Wix','Shopify','Google','Squarespace','Zoho','Webflow','Woocommerce','Cpanel','Notion','Trello','Hubspot','Figma','Quickbooks','Github','Stripe','Zapier','Asana','Zoom'];
export async function writePlatformLogos(directory) {
  await mkdir(directory, { recursive: true });
  for (const key of selected) {
    const icon = icons['si'+key];
    if (!icon) throw new Error('Missing platform mark: '+key);
    const svg = icon.svg.replace('<svg ', `<svg fill="#${icon.hex}" `);
    await writeFile(`${directory}/${key.toLowerCase()}.svg`, svg);
  }
}
