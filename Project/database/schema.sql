-- Reference schema only. Use backend Alembic migrations for real database changes.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE userrole AS ENUM ('CUSTOMER', 'CREATOR', 'ADMIN');
CREATE TYPE requirementstatus AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE quotationstatus AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE orderstatus AS ENUM ('PENDING', 'ACTIVE', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED');
CREATE TYPE paymentstatus AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role userrole NOT NULL,
  avatar_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  brand_name VARCHAR(160),
  headline VARCHAR(180),
  description TEXT,
  years_of_experience INTEGER NOT NULL DEFAULT 0,
  portfolio_cover_url TEXT,
  average_rating FLOAT NOT NULL DEFAULT 0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  total_orders_completed INTEGER NOT NULL DEFAULT 0,
  response_time_hours INTEGER,
  instagram_url TEXT,
  website_url TEXT,
  youtube_url TEXT,
  is_verified_creator BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE creator_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id),
  category_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  budget_min DECIMAL(12, 2) NOT NULL,
  budget_max DECIMAL(12, 2) NOT NULL,
  deadline DATE,
  status requirementstatus NOT NULL DEFAULT 'OPEN',
  ai_generated_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE requirement_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES requirements(id),
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES requirements(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  proposed_price DECIMAL(12, 2) NOT NULL,
  estimated_days INTEGER NOT NULL,
  message TEXT NOT NULL,
  status quotationstatus NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL UNIQUE REFERENCES requirements(id),
  quotation_id UUID NOT NULL UNIQUE REFERENCES quotations(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  total_amount DECIMAL(12, 2) NOT NULL,
  platform_commission DECIMAL(12, 2) NOT NULL,
  status orderstatus NOT NULL DEFAULT 'PENDING',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  file_url TEXT NOT NULL,
  file_type VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  razorpay_payment_id TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  payment_status paymentstatus NOT NULL DEFAULT 'PENDING',
  payment_method VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  action_url VARCHAR(255),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE saved_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id),
  creator_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_saved_creator_customer_creator UNIQUE (customer_id, creator_id)
);

CREATE TABLE ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  prompt TEXT NOT NULL,
  generated_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
