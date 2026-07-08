import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CreatePaymentParams {
  orderId: string;
  eventId: string;
  value: number;
  description: string;
  buyer: { name: string; email: string; phone?: string };
  /** Organizer's own Asaas key — when set, the charge is created under their
   * account instead of the platform's. */
  credentials?: { apiKey: string };
}

export interface CreatedPayment {
  /** Provider payment id, persisted as `orders.asaas_payment_id`. */
  id: string;
  /** URL the buyer is sent to in order to pay. */
  invoiceUrl: string;
}

/**
 * Thin client for the Asaas charges API.
 *
 * When `ASAAS_API_KEY` is not configured the service runs in **dev mode**: it
 * skips the network call and returns a synthetic payment so the checkout flow
 * (and the payment webhook) can be exercised locally without Asaas credentials.
 */
@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('ASAAS_API_KEY');
    this.baseUrl = this.config.get<string>(
      'ASAAS_API_URL',
      'https://sandbox.asaas.com/api/v3',
    );
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatedPayment> {
    if (!params.credentials?.apiKey && !this.isConfigured) {
      const frontendUrl = this.config.get<string>(
        'FRONTEND_URL',
        'http://localhost:3001',
      );
      this.logger.warn(
        `ASAAS_API_KEY not set — returning a dev payment for order ${params.orderId}`,
      );
      return {
        id: `dev_${params.orderId}`,
        invoiceUrl: `${frontendUrl}/events/${params.eventId}/checkout/pending?order=${params.orderId}`,
      };
    }

    const apiKey = params.credentials?.apiKey ?? (this.apiKey as string);
    const customerId = await this.createCustomer(params.buyer, apiKey);
    const payment = await this.request<{ id: string; invoiceUrl: string }>(
      'POST',
      '/payments',
      {
        customer: customerId,
        billingType: 'UNDEFINED', // let the buyer choose PIX / card / boleto
        value: params.value,
        dueDate: this.dueDate(),
        description: params.description,
        externalReference: params.orderId,
      },
      apiKey,
    );
    return { id: payment.id, invoiceUrl: payment.invoiceUrl };
  }

  /** Cheap authenticated call used to confirm an organizer-supplied key is
   * valid before persisting it. */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      await this.request('GET', '/customers?limit=1', undefined, apiKey);
      return true;
    } catch {
      return false;
    }
  }

  private async createCustomer(
    buyer: { name: string; email: string; phone?: string },
    apiKey: string,
  ): Promise<string> {
    const customer = await this.request<{ id: string }>(
      'POST',
      '/customers',
      { name: buyer.name, email: buyer.email, mobilePhone: buyer.phone },
      apiKey,
    );
    return customer.id;
  }

  private async request<T>(
    method: string,
    path: string,
    body: unknown,
    apiKey: string = this.apiKey as string,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          access_token: apiKey,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      this.logger.error(`Asaas request failed: ${String(error)}`);
      throw new ServiceUnavailableException('Payment provider unavailable');
    }

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Asaas ${path} -> ${response.status}: ${detail}`);
      throw new ServiceUnavailableException(
        'Payment provider rejected the request',
      );
    }
    return (await response.json()) as T;
  }

  /** Asaas expects a YYYY-MM-DD due date; give the buyer three days. */
  private dueDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString().slice(0, 10);
  }
}
