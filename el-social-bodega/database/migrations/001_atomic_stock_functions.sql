-- Migration: Atomic inventory stock functions
-- Run this in your Supabase SQL editor.
-- These functions are called via RPC from the Python backend to prevent
-- race conditions when multiple requests modify stock simultaneously.

-- Atomic decrement: subtracts `amount` from inventory_stock.current_quantity
-- only if stock is sufficient. Raises an exception if stock is insufficient
-- or the product doesn't exist, so the calling transaction is rolled back.
CREATE OR REPLACE FUNCTION decrement_stock(p_id INT, amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_qty INT;
BEGIN
    UPDATE inventory_stock
    SET current_quantity = current_quantity - amount
    WHERE product_id = p_id
      AND current_quantity >= amount
    RETURNING current_quantity INTO new_qty;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'insufficient_stock: product_id=%, requested=%', p_id, amount;
    END IF;

    RETURN new_qty;
END;
$$;

-- Atomic increment: adds `amount` to inventory_stock.current_quantity.
-- Creates a stock row if it doesn't exist yet (should not happen normally,
-- but is a safe fallback).
CREATE OR REPLACE FUNCTION increment_stock(p_id INT, amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_qty INT;
BEGIN
    INSERT INTO inventory_stock (product_id, current_quantity)
    VALUES (p_id, amount)
    ON CONFLICT (product_id)
    DO UPDATE SET current_quantity = inventory_stock.current_quantity + EXCLUDED.current_quantity
    RETURNING current_quantity INTO new_qty;

    RETURN new_qty;
END;
$$;
