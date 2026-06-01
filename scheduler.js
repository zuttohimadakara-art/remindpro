const airtable = require('./airtable');
const email = require('./email');

async function checkOverdueReminders() {
  try {
    const overdueInvoices = await airtable.getOverdueInvoices();
    console.log(`[Scheduler] Found ${overdueInvoices.length} overdue invoices`);

    for (const invoice of overdueInvoices) {
      const lastSent = invoice.LastReminderSent ? new Date(invoice.LastReminderSent) : null;
      const now = new Date();

      if (lastSent) {
        const hoursSince = (now - lastSent) / (1000 * 60 * 60);
        if (hoursSince < 48) continue;
      }

      const client = await airtable.getClient(invoice.ClientID);
      if (!client || !client.Email) continue;

      const reminderCount = (invoice.ReminderCount || 0) + 1;
      let message;
      if (reminderCount === 1) {
        message = `Hi ${client.Name},\n\nThis is a friendly reminder that invoice $${invoice.Amount} was due on ${invoice.DueDate}. Please pay at your earliest convenience.\n\nThank you,\n${invoice.BusinessName || 'Your Service Provider'}`;
      } else if (reminderCount <= 3) {
        message = `Hi ${client.Name},\n\nGentle reminder: invoice $${invoice.Amount} (due ${invoice.DueDate}) is still outstanding. Please arrange payment.\n\nThank you,\n${invoice.BusinessName || 'Your Service Provider'}`;
      } else {
        message = `Hi ${client.Name},\n\nUrgent: invoice $${invoice.Amount} is now ${reminderCount} days overdue. Please pay immediately to avoid any service disruption.\n\nThank you,\n${invoice.BusinessName || 'Your Service Provider'}`;
      }

      const subject = `Invoice Reminder: $${invoice.Amount} due ${invoice.DueDate}`;
      const result = await email.sendEmail(client.Email, subject, message);

      await airtable.updateInvoice(invoice.id, {
        ReminderCount: reminderCount,
        LastReminderSent: now.toISOString()
      });

      await airtable.createReminder({
        InvoiceID: invoice.id,
        UserID: invoice.UserID,
      SentTo: client.Email,
      Message: message,
      Status: result.success ? 'sent' : 'failed',
      Error: result.error || ''
      });

      if (result.success) {
        console.log(`[Scheduler] Reminder sent for invoice ${invoice.id}`);
      } else {
        console.error(`[Scheduler] Failed to send reminder for invoice ${invoice.id}: ${result.error}`);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error:', err);
  }
}

module.exports = { checkOverdueReminders };
