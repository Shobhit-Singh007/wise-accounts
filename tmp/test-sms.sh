#!/bin/bash
TOKEN=$(curl -s -X POST 'http://localhost:3000/api/v1/auth/login' -H 'Content-Type: application/json' -d '{"phone":"9999999999","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
echo "Token obtained: ${#TOKEN} chars"
RESULT=$(curl -s -X POST "http://localhost:3000/api/v1/businesses/8caf3e59-2f77-414d-8fcf-bcf31d3f5ba6/notifications/payment-reminder" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"customerId":"test","phone":"9971587302","message":"Test SMS from Wise Accounts"}')
echo "Result: $RESULT"
sleep 5
docker logs wise-accounts-api --tail 30 2>&1 | grep -iE 'sms|msg91|twilio|notification|error|email'
