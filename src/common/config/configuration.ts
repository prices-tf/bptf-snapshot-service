export interface Config {
  port: number;
  database: DatabaseConfig;
  queue: QueueConfig;
  rabbitmq: RabbitMQConfig;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface QueueConfig {
  host: string;
  port: number;
  password: string;
}

export interface RabbitMQConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export default (): Config => {
  return {
    port:
      process.env.NODE_ENV === 'production'
        ? 3000
        : parseInt(process.env.PORT, 10),
    database: {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT, 10),
      username: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DATABASE,
    },
    queue: {
      host: process.env.QUEUE_HOST,
      port: parseInt(process.env.QUEUE_PORT, 10),
      password: process.env.QUEUE_PASSWORD,
    },
    rabbitmq: {
      host: process.env.RABBITMQ_HOST,
      port: parseInt(process.env.RABBITMQ_PORT, 10),
      username: process.env.RABBITMQ_USERNAME,
      password: process.env.RABBITMQ_PASSWORD,
    },
  };
};
