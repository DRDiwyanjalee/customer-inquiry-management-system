
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

CREATE TABLE IF NOT EXISTS inquiry_status_history (
    id SERIAL PRIMARY KEY,

    inquiry_id INTEGER NOT NULL
        REFERENCES inquiries(id) ON DELETE CASCADE,

    previous_status VARCHAR(20) NOT NULL,
    new_status VARCHAR(20) NOT NULL,

    reopen_reason VARCHAR(500),

    changed_by INTEGER NOT NULL
        REFERENCES users(id),

    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_history_statuses CHECK (
        previous_status IN ('New', 'In Progress', 'Resolved')
        AND new_status IN ('New', 'In Progress', 'Resolved')
    ),

    CONSTRAINT valid_reopen_reason CHECK (
        (
            previous_status = 'Resolved'
            AND new_status = 'In Progress'
            AND reopen_reason IS NOT NULL
            AND length(trim(reopen_reason)) BETWEEN 10 AND 500
        )
        OR
        (
            NOT (
                previous_status = 'Resolved'
                AND new_status = 'In Progress'
            )
            AND reopen_reason IS NULL
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_inquiry_status_history_inquiry
ON inquiry_status_history(inquiry_id, changed_at DESC);