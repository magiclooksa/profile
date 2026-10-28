/** A request sent from the contact form. */
export interface ContactMessage {
  name: string;
  phone: string;
  email: string;
  city: string;
  message: string;
  /** Hidden field: left empty by people, filled by spam bots. */
  website: string;
}

/** Port: where contact-form messages go (the server's database). */
export interface MessageGateway {
  send(message: ContactMessage): Promise<void>;
}
