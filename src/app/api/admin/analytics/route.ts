import { NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/apiUtils";
import { query, queryOne } from "@/lib/db";

export async function GET() {
  try {
    await requireRole("ADMIN");

    const totals = await queryOne<{
      total_revenue: string;
      tickets_sold: string;
      today_revenue: string;
    }>(
      `SELECT
        COALESCE((SELECT SUM(total_amount) FROM orders WHERE status = 'PAID'), 0) as total_revenue,
        COALESCE((SELECT COUNT(*) FROM tickets), 0) as tickets_sold,
        COALESCE((SELECT SUM(total_amount) FROM orders WHERE status = 'PAID' AND created_at >= CURRENT_DATE), 0) as today_revenue
      `
    );

    const availableTickets = await queryOne<{ available: string }>(
      `SELECT COALESCE(SUM(total_inventory - reserved_count - sold_count), 0) as available FROM ticket_types WHERE is_active`
    );
    const eventCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM events`
    );
    const pendingPayments = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM payments WHERE status = 'AWAITING_ADMIN_REVIEW'`
    );
    const checkIns = await queryOne<{ used: string; total: string }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'USED') as used, COUNT(*) as total FROM tickets`
    );

    const recentOrders = await query(
      `SELECT o.id, o.order_number, o.customer_full_name, o.total_amount, o.status, o.created_at, e.name as event_name
       FROM orders o JOIN events e ON e.id = o.event_id
       ORDER BY o.created_at DESC LIMIT 10`
    );

    const revenueByDate = await query(
      `SELECT to_char(created_at, 'YYYY-MM-DD') as date, SUM(total_amount) as revenue
       FROM orders WHERE status = 'PAID' AND created_at >= now() - interval '30 days'
       GROUP BY 1 ORDER BY 1`
    );

    const ticketsByDate = await query(
      `SELECT to_char(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
       FROM tickets WHERE created_at >= now() - interval '30 days'
       GROUP BY 1 ORDER BY 1`
    );

    const bestSellingEvents = await query(
      `SELECT e.name, COUNT(t.id) as tickets_sold, COALESCE(SUM(oi.subtotal), 0) as revenue
       FROM events e
       LEFT JOIN tickets t ON t.event_id = e.id
       LEFT JOIN order_items oi ON oi.order_id = t.order_id
       GROUP BY e.id, e.name
       ORDER BY tickets_sold DESC LIMIT 5`
    );

    const bestSellingTicketTypes = await query(
      `SELECT tt.name, COUNT(t.id) as tickets_sold
       FROM ticket_types tt
       LEFT JOIN tickets t ON t.ticket_type_id = tt.id
       GROUP BY tt.id, tt.name
       ORDER BY tickets_sold DESC LIMIT 5`
    );

    return NextResponse.json({
      totalRevenue: Number(totals?.total_revenue ?? 0),
      todayRevenue: Number(totals?.today_revenue ?? 0),
      ticketsSold: Number(totals?.tickets_sold ?? 0),
      availableTickets: Number(availableTickets?.available ?? 0),
      eventCount: Number(eventCount?.count ?? 0),
      pendingPayments: Number(pendingPayments?.count ?? 0),
      checkedIn: Number(checkIns?.used ?? 0),
      totalTickets: Number(checkIns?.total ?? 0),
      recentOrders,
      revenueByDate,
      ticketsByDate,
      bestSellingEvents,
      bestSellingTicketTypes,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
