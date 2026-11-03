export interface CakeVariant {
  _id: string;
  name: string;
  price: number;
  stock: number;
  reserved: number;
  flavours: string[];
  preparationDays: number;
  instantEligible: boolean;
  advanceEligible: boolean;
  active: boolean;
}

export interface CakeItem {
  _id: string;
  name: string;
  description?: string;
  category: string;
  images?: string[];
  variants: CakeVariant[];
}

export function formatCakesResponse(items: CakeItem[], total: number, page: number): string {
  if (!items || items.length === 0) {
    return "No cakes found matching your request.";
  }

  const lines: string[] = [
    `Found ${total} cake(s) in catalog (showing page ${page}):\n`,
  ];

  for (const cake of items) {
    lines.push(`🎂 **${cake.name}** (Category: ${cake.category})`);
    if (cake.description) {
      lines.push(`   *${cake.description}*`);
    }
    lines.push("   Variants:");
    for (const v of cake.variants) {
      const availableStock = Math.max(0, (v.stock || 0) - (v.reserved || 0));
      const instantStr = v.instantEligible ? "Immediate Delivery/Pickup available" : "Advance booking only";
      const leadTime = v.preparationDays ? `(${v.preparationDays} day prep lead time)` : "";
      lines.push(
        `   - **${v.name}**: ₹${v.price} | Stock: ${availableStock} ready | ${instantStr} ${leadTime}`
      );
      if (v.flavours && v.flavours.length > 0) {
        lines.push(`     Flavors: ${v.flavours.join(", ")}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export interface BookingSlotItem {
  date: string;
  slot: string;
  capacity?: number;
  reserved?: number;
  remaining: number;
  available: boolean;
}

export function formatBookingAvailability(
  slots: BookingSlotItem[],
  from: string,
  to: string,
  earliestDate?: string
): string {
  const lines: string[] = [
    `📅 **Booking Availability from ${from} to ${to}** (Asia/Kolkata timezone)`,
  ];

  if (earliestDate) {
    lines.push(`⚠️ *Notice: BAKEBERRY requires a minimum advance booking lead time. Earliest eligible date is ${earliestDate}.*`);
  }

  if (!slots || slots.length === 0) {
    lines.push("\nNo active booking slots found in this date range. Please inquire with the bakery or choose a later date.");
    return lines.join("\n");
  }

  const grouped: Record<string, BookingSlotItem[]> = {};
  for (const s of slots) {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  }

  for (const [date, daySlots] of Object.entries(grouped)) {
    lines.push(`\n**Date: ${date}**`);
    for (const slot of daySlots) {
      const status = slot.available ? `✅ Available (${slot.remaining} slots remaining)` : "❌ Fully Booked";
      lines.push(`  - Slot \`${slot.slot}\`: ${status}`);
    }
  }

  return lines.join("\n");
}

export function formatOrderStatus(order: any): string {
  if (!order) return "Order not found.";

  const lines: string[] = [
    `📦 **Order Summary: ${order.orderNumber || order._id}**`,
    `Status: **${order.orderStatus?.toUpperCase()}** (Payment: ${order.paymentStatus?.toUpperCase()})`,
    `Fulfillment: **${order.fulfillment}**`,
    `Scheduled Date: ${order.bookingDate} | Slot: ${order.bookingSlot}`,
    `Total Amount: ₹${order.total} (Subtotal: ₹${order.subtotal}, Delivery Fee: ₹${order.deliveryFee || 0})`,
    "",
    "**Items:**",
  ];

  if (order.items && Array.isArray(order.items)) {
    for (const item of order.items) {
      const detail = item.flavour ? ` (${item.flavour})` : "";
      const custom = item.customization ? ` [Note: ${item.customization}]` : "";
      lines.push(
        `- ${item.quantity}x ${item.name} - ${item.variantName}${detail}${custom} @ ₹${item.unitPrice} each`
      );
    }
  }

  if (order.address && order.fulfillment === "delivery") {
    lines.push("");
    lines.push(`**Delivery Address:** ${order.address.fullName}, ${order.address.line1}, ${order.address.city} - ${order.address.postalCode}`);
  }

  if (order.statusHistory && order.statusHistory.length > 0) {
    lines.push("");
    lines.push("**Timeline:**");
    for (const history of order.statusHistory) {
      const time = history.timestamp ? new Date(history.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "";
      lines.push(`- [${history.status}] ${history.note || ""} ${time ? `(${time})` : ""}`);
    }
  }

  return lines.join("\n");
}

export function formatInventorySummary(items: any[]): string {
  if (!items || items.length === 0) {
    return "No inventory items found.";
  }

  const lines: string[] = [
    "📊 **BAKEBERRY Real-time Inventory Summary** (Admin/Staff view)\n",
  ];

  for (const item of items) {
    let icon = "🟢";
    if (item.status === "out_of_stock") icon = "🔴";
    else if (item.status === "low_stock") icon = "🟡";
    else if (item.status === "unavailable") icon = "⚪";

    lines.push(
      `${icon} **${item.cakeName}** (${item.variantName})`
    );
    lines.push(
      `   Status: ${item.status.toUpperCase()} | In Stock: ${item.stock} | Reserved: ${item.reserved} | Available: ${item.available} | Daily Capacity: ${item.productionCapacityPerDay}`
    );
  }

  return lines.join("\n");
}

