#!/bin/bash
#
# Creates the Village AI Agent OAuth application in Village-web
# and outputs the client_id/client_secret for nanobot configuration.
#
# Usage: ./scripts/setup_village_oauth.sh
#
# Prerequisites:
#   - Village-web Rails server must be running (or at least the DB accessible)
#   - Run from the nanobot repo root directory
#

set -euo pipefail

VILLAGE_WEB_DIR="${VILLAGE_WEB_DIR:-$(cd "$(dirname "$0")/../../village-web" && pwd)}"
NANOBOT_REDIRECT_URI="${NANOBOT_REDIRECT_URI:-http://localhost:18790/oauth/callback}"

echo "=== Village AI Agent OAuth Setup ==="
echo ""
echo "Village-web dir: $VILLAGE_WEB_DIR"
echo "Redirect URI:    $NANOBOT_REDIRECT_URI"
echo ""

if [ ! -d "$VILLAGE_WEB_DIR" ]; then
  echo "ERROR: Village-web directory not found at $VILLAGE_WEB_DIR"
  echo "Set VILLAGE_WEB_DIR to point to your village-web checkout."
  exit 1
fi

# Create the Doorkeeper application via Rails runner
RESULT=$(cd "$VILLAGE_WEB_DIR" && bin/rails runner "
app = Doorkeeper::Application.find_or_initialize_by(name: 'Village AI Agent')
if app.new_record?
  app.redirect_uri = '$NANOBOT_REDIRECT_URI'
  app.scopes = 'public openid email profile'
  app.confidential = true
  app.save!
  puts \"CREATED\"
else
  puts \"EXISTS\"
end
puts \"CLIENT_ID=#{app.uid}\"
puts \"CLIENT_SECRET=#{app.secret}\"
")

echo "$RESULT" | head -1
echo ""

CLIENT_ID=$(echo "$RESULT" | grep CLIENT_ID | cut -d= -f2)
CLIENT_SECRET=$(echo "$RESULT" | grep CLIENT_SECRET | cut -d= -f2)

echo "Client ID:     $CLIENT_ID"
echo "Client Secret: $CLIENT_SECRET"
echo ""
echo "Add this to your ~/.nanobot/config.json under tools.village:"
echo ""
echo "  \"village\": {"
echo "    \"base_url\": \"http://localhost:3000\","
echo "    \"client_id\": \"$CLIENT_ID\","
echo "    \"client_secret\": \"$CLIENT_SECRET\""
echo "  }"
echo ""
echo "Done!"
