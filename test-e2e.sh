#!/bin/bash
set -e
BASE="http://localhost:3000"
JAR_ADMIN=/tmp/cookies_admin.txt
JAR_CUST=/tmp/cookies_customer.txt
rm -f "$JAR_ADMIN" "$JAR_CUST"

echo "== 1. Admin login =="
curl -s --max-time 15 -c "$JAR_ADMIN" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nightlist.jo","password":"Admin123!"}' | tee /tmp/admin_login.json
echo

echo "== 2. Get event (Summer Night) =="
EVENT_JSON=$(curl -s --max-time 15 "$BASE/api/events/summer-night")
echo "$EVENT_JSON" | head -c 500
echo
EVENT_ID=$(echo "$EVENT_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.event.id)})")
TT_ID=$(echo "$EVENT_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.ticketTypes[0].id)})")
echo "eventId=$EVENT_ID ticketTypeId(VIP or first tier)=$TT_ID"

echo
echo "== 3. Create order (3 tickets) as guest, three-part name =="
ORDER_JSON=$(curl -s --max-time 15 -X POST "$BASE/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"$EVENT_ID\",\"customerFullName\":\"Bashar Abd Nasser\",\"email\":\"bashar@example.com\",\"phone\":\"0790000000\",\"lines\":[{\"ticketTypeId\":\"$TT_ID\",\"quantity\":3}]}")
echo "$ORDER_JSON"
ORDER_ID=$(echo "$ORDER_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.order.id)})")
echo "orderId=$ORDER_ID"

echo
echo "== 3b. Test three-part-name validation rejects a single-word name =="
curl -s --max-time 15 -X POST "$BASE/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"$EVENT_ID\",\"customerFullName\":\"Bashar\",\"email\":\"x@example.com\",\"phone\":\"0790000001\",\"lines\":[{\"ticketTypeId\":\"$TT_ID\",\"quantity\":1}]}"
echo

echo
echo "== 4. Customer confirms CliQ transfer completed =="
curl -s --max-time 15 -X POST "$BASE/api/orders/$ORDER_ID/confirm-transfer"
echo

echo
echo "== 5. Order status should now be PAYMENT_VERIFICATION =="
curl -s --max-time 15 "$BASE/api/orders/$ORDER_ID" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('status:',j.order.status)})"

echo
echo "== 6. Admin sees it in pending payments queue =="
curl -s --max-time 15 -b "$JAR_ADMIN" "$BASE/api/admin/payments/pending" | head -c 1000
echo

echo
echo "== 7. Admin approves payment (first time) =="
APPROVE1=$(curl -s --max-time 15 -b "$JAR_ADMIN" -X POST "$BASE/api/admin/payments/$ORDER_ID/approve")
echo "$APPROVE1"
echo

echo
echo "== 8. Admin clicks approve AGAIN (must be idempotent, no duplicate tickets) =="
APPROVE2=$(curl -s --max-time 15 -b "$JAR_ADMIN" -X POST "$BASE/api/admin/payments/$ORDER_ID/approve")
echo "$APPROVE2"
echo

echo
echo "== 9. Fetch order with tickets =="
ORDER_DETAILS=$(curl -s --max-time 15 "$BASE/api/orders/$ORDER_ID")
echo "$ORDER_DETAILS" | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const j=JSON.parse(d);
  console.log('order status:', j.order.status);
  console.log('ticket count:', j.tickets.length);
  j.tickets.forEach(t=>console.log(' -', t.ticket_number, t.qr_token.slice(0,12)+'...', t.status));
})"

TICKET1_ID=$(echo "$ORDER_DETAILS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.tickets[0].id)})")
TICKET1_QR=$(echo "$ORDER_DETAILS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.tickets[0].qr_token)})")
TICKET2_QR=$(echo "$ORDER_DETAILS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.tickets[1].qr_token)})")

echo
echo "== 10. Download individual ticket PDF (should be a real PDF) =="
curl -s --max-time 15 "$BASE/api/tickets/$TICKET1_ID/pdf" -o /tmp/ticket1.pdf
file /tmp/ticket1.pdf
ls -la /tmp/ticket1.pdf

echo
echo "== 11. Download ZIP of all tickets in the order =="
curl -s --max-time 15 "$BASE/api/orders/$ORDER_ID/tickets-zip" -o /tmp/tickets.zip
file /tmp/tickets.zip
unzip -l /tmp/tickets.zip

echo
echo "== 12. Staff logs in and scans ticket 1 (first scan -> VALID_CHECKED_IN) =="
curl -s --max-time 15 -c "$JAR_CUST" -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@nightlist.jo","password":"Staff123!"}' > /tmp/staff_login.json
cat /tmp/staff_login.json
echo
curl -s --max-time 15 -b "$JAR_CUST" -X POST "$BASE/api/checkin" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$TICKET1_QR\"}"
echo

echo
echo "== 13. Scan ticket 1 AGAIN (must be ALREADY_USED, not a second success) =="
curl -s --max-time 15 -b "$JAR_CUST" -X POST "$BASE/api/checkin" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$TICKET1_QR\"}"
echo

echo
echo "== 14. Scan ticket 2 (different ticket, same order) -> should be independently VALID =="
curl -s --max-time 15 -b "$JAR_CUST" -X POST "$BASE/api/checkin" \
  -H "Content-Type: application/json" \
  -d "{\"identifier\":\"$TICKET2_QR\"}"
echo

echo
echo "== 15. Public verify page data for ticket 1 (now USED) =="
curl -s --max-time 15 "$BASE/api/ticket/verify/$TICKET1_QR"
echo

echo
echo "ALL TESTS EXECUTED."
