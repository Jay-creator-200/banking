export class WhatsAppService {
  constructor() {
    this.provider = process.env.WHATSAPP_PROVIDER || 'mock';
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v16.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneId = process.env.WHATSAPP_PHONE_ID;
  }

  async sendTemplateMessage(mobile, templateName, components) {
    console.log(`[WhatsApp Service] Sending template "${templateName}" to ${mobile}`);
    if (this.provider === 'business_api' && this.accessToken && this.phoneId) {
      try {
        const url = `${this.apiUrl}/${this.phoneId}/messages`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: mobile,
            type: 'template',
            template: {
              name: templateName,
              language: { code: 'en' },
              components: components,
            },
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || 'WhatsApp API error');
        }
        console.log('[WhatsApp Service] Sent successfully:', data.messages?.[0]?.id);
        return true;
      } catch (err) {
        console.error('[WhatsApp Service] API Fail:', err.message);
        return false;
      }
    } else {
      console.log(`[MOCK WHATSAPP] To: ${mobile}\nTemplate: ${templateName}\nVariables:`, JSON.stringify(components));
      return true;
    }
  }

  async sendDepositConfirmation(mobile, memberName, amount, accountNo) {
    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: memberName },
          { type: 'text', text: amount },
          { type: 'text', text: accountNo },
        ],
      },
    ];
    return this.sendTemplateMessage(mobile, 'deposit_confirmation', components);
  }

  async sendLoanReminder(mobile, memberName, amount, dueDate, loanNo) {
    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: memberName },
          { type: 'text', text: amount },
          { type: 'text', text: dueDate },
          { type: 'text', text: loanNo },
        ],
      },
    ];
    return this.sendTemplateMessage(mobile, 'loan_reminder', components);
  }

  async sendEMIDueAlert(mobile, memberName, amount, dueDate, loanNo) {
    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: memberName },
          { type: 'text', text: amount },
          { type: 'text', text: dueDate },
          { type: 'text', text: loanNo },
        ],
      },
    ];
    return this.sendTemplateMessage(mobile, 'emi_due_alert', components);
  }

  async sendMaturityAlert(mobile, memberName, accountNo, maturityDate, amount) {
    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: memberName },
          { type: 'text', text: accountNo },
          { type: 'text', text: maturityDate },
          { type: 'text', text: amount },
        ],
      },
    ];
    return this.sendTemplateMessage(mobile, 'maturity_alert', components);
  }
}

const whatsAppServiceInstance = new WhatsAppService();
export default whatsAppServiceInstance;
export { whatsAppServiceInstance as WhatsAppServiceInstance };
