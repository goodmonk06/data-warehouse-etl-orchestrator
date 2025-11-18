-- Example source database initialization
-- This simulates a typical application database

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER,
    unit_price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO customers (email, first_name, last_name) VALUES
    ('john.doe@example.com', 'John', 'Doe'),
    ('jane.smith@example.com', 'Jane', 'Smith'),
    ('bob.johnson@example.com', 'Bob', 'Johnson'),
    ('alice.williams@example.com', 'Alice', 'Williams'),
    ('charlie.brown@example.com', 'Charlie', 'Brown');

INSERT INTO products (name, category, price) VALUES
    ('Laptop Pro', 'Electronics', 1299.99),
    ('Wireless Mouse', 'Electronics', 29.99),
    ('Desk Chair', 'Furniture', 199.99),
    ('Monitor 27"', 'Electronics', 349.99),
    ('Keyboard Mechanical', 'Electronics', 89.99),
    ('Standing Desk', 'Furniture', 599.99);

INSERT INTO orders (customer_id, total_amount, status) VALUES
    (1, 1329.98, 'completed'),
    (2, 549.98, 'completed'),
    (3, 1499.97, 'pending'),
    (1, 89.99, 'completed'),
    (4, 799.98, 'completed');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    (1, 1, 1, 1299.99),
    (1, 2, 1, 29.99),
    (2, 4, 1, 349.99),
    (2, 3, 1, 199.99),
    (3, 1, 1, 1299.99),
    (3, 3, 1, 199.99),
    (4, 5, 1, 89.99),
    (5, 6, 1, 599.99),
    (5, 3, 1, 199.99);
