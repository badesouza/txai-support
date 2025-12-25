#!/usr/bin/env bash
# =============================================================================
# Test script for TXAI Support - Firestore migration
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:3001/api}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

echo "========================================="
echo "🧪 TXAI Support - Firestore Test Suite"
echo "========================================="
echo ""
echo "API URL: ${API_URL}"
if [ -z "${ADMIN_PASSWORD}" ]; then
    echo "⚠️  ADMIN_PASSWORD not set - admin tests will be skipped"
fi
echo ""

# Wait for backend to be ready
echo -e "${YELLOW}⏳ Waiting for backend...${NC}"
MAX_WAIT=60
WAITED=0
until curl -sf "${API_URL}/health" >/dev/null 2>&1; do
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo -e "${RED}❌ Backend not ready after ${MAX_WAIT}s${NC}"
        exit 1
    fi
    sleep 2
    WAITED=$((WAITED + 2))
done
echo -e "${GREEN}✓ Backend is ready${NC}"
echo ""

# Test 1: Health check
echo -e "${YELLOW}1. Testing health endpoint...${NC}"
HEALTH=$(curl -sf "${API_URL}/health")
echo "Response: ${HEALTH}"
echo -e "${GREEN}✓ Health check passed${NC}"
echo ""

# Test 2: Register a new user
echo -e "${YELLOW}2. Testing user registration...${NC}"
REGISTER_RESPONSE=$(curl -sf -X POST "${API_URL}/users/register" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Test User",
        "email": "test-'$(date +%s)'@example.com",
        "password": "test123",
        "phone": "11999999999",
        "profile": "USER"
    }' || echo '{"error":"Registration failed"}')

echo "Response: ${REGISTER_RESPONSE}"

if echo "$REGISTER_RESPONSE" | grep -q '"token"'; then
    echo -e "${GREEN}✓ User registration passed${NC}"
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    echo -e "${RED}✗ User registration failed${NC}"
    TOKEN=""
fi
echo ""

# Test 3: Login with admin
echo -e "${YELLOW}3. Testing admin login...${NC}"
if [ -n "${ADMIN_PASSWORD}" ]; then
    LOGIN_RESPONSE=$(curl -sf -X POST "${API_URL}/users/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"admin@txai.com\",
            \"password\": \"${ADMIN_PASSWORD}\"
        }" || echo '{"error":"Login failed"}')

    echo "Response: ${LOGIN_RESPONSE}"

    if echo "$LOGIN_RESPONSE" | grep -q '"token"'; then
        echo -e "${GREEN}✓ Admin login passed${NC}"
        ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    else
        echo -e "${YELLOW}⚠ Admin login failed - admin may not be seeded${NC}"
        ADMIN_TOKEN=""
    fi
else
    echo -e "${YELLOW}⚠ Skipping admin login - ADMIN_PASSWORD not set${NC}"
    ADMIN_TOKEN=""
fi
echo ""

# Test 4: Create a call (if we have a token)
if [ -n "${ADMIN_TOKEN:-}" ]; then
    echo -e "${YELLOW}4. Testing call creation...${NC}"
    CALL_RESPONSE=$(curl -sf -X POST "${API_URL}/calls" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" \
        -d '{
            "title": "Test Call",
            "description": "This is a test call created by the test script",
            "status": "OPEN",
            "priority": "MEDIUM"
        }' || echo '{"error":"Call creation failed"}')
    
    echo "Response: ${CALL_RESPONSE}"
    
    if echo "$CALL_RESPONSE" | grep -q '"id"'; then
        echo -e "${GREEN}✓ Call creation passed${NC}"
        CALL_ID=$(echo "$CALL_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    else
        echo -e "${RED}✗ Call creation failed${NC}"
        CALL_ID=""
    fi
    echo ""
    
    # Test 5: List calls
    echo -e "${YELLOW}5. Testing call listing...${NC}"
    LIST_RESPONSE=$(curl -sf "${API_URL}/calls" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" || echo '{"error":"List failed"}')
    
    echo "Response (truncated): ${LIST_RESPONSE:0:200}..."
    
    if echo "$LIST_RESPONSE" | grep -q '"calls"'; then
        echo -e "${GREEN}✓ Call listing passed${NC}"
    else
        echo -e "${RED}✗ Call listing failed${NC}"
    fi
    echo ""
    
    # Test 6: Get specific call
    if [ -n "${CALL_ID:-}" ]; then
        echo -e "${YELLOW}6. Testing get call by ID...${NC}"
        GET_RESPONSE=$(curl -sf "${API_URL}/calls/${CALL_ID}" \
            -H "Authorization: Bearer ${ADMIN_TOKEN}" || echo '{"error":"Get failed"}')
        
        echo "Response: ${GET_RESPONSE}"
        
        if echo "$GET_RESPONSE" | grep -q '"id"'; then
            echo -e "${GREEN}✓ Get call passed${NC}"
        else
            echo -e "${RED}✗ Get call failed${NC}"
        fi
        echo ""
    fi
    
    # Test 7: List users
    echo -e "${YELLOW}7. Testing user listing...${NC}"
    USERS_RESPONSE=$(curl -sf "${API_URL}/users" \
        -H "Authorization: Bearer ${ADMIN_TOKEN}" || echo '{"error":"List failed"}')
    
    echo "Response (truncated): ${USERS_RESPONSE:0:200}..."
    
    if echo "$USERS_RESPONSE" | grep -q '"users"'; then
        echo -e "${GREEN}✓ User listing passed${NC}"
    else
        echo -e "${RED}✗ User listing failed${NC}"
    fi
    echo ""
fi

echo "========================================="
echo -e "${GREEN}✅ Test suite completed${NC}"
echo "========================================="

