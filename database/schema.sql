
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inquiries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_name VARCHAR(150) NOT NULL,
    customer_contact VARCHAR(255) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    source_channel VARCHAR(20) NOT NULL
        CHECK (source_channel IN (
            'Phone Call', 'Email', 'WhatsApp', 'Website', 'Other'
        )),
    status VARCHAR(20) NOT NULL DEFAULT 'New'
        CHECK (status IN ('New', 'In Progress', 'Resolved')),
    created_by BIGINT NOT NULL REFERENCES users(id),
    updated_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status
    ON inquiries(status);

CREATE INDEX IF NOT EXISTS idx_inquiries_created_at
    ON inquiries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inquiries_customer_contact
    ON inquiries(customer_contact);
