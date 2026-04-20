-- 026: Input length constraints on text columns
-- Prevents oversized payloads from reaching the database

-- Profiles
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_display_name_len CHECK (length(display_name) <= 100),
  ADD CONSTRAINT chk_phone_len CHECK (length(phone) <= 30),
  ADD CONSTRAINT chk_address1_len CHECK (length(address_line1) <= 200),
  ADD CONSTRAINT chk_address2_len CHECK (length(address_line2) <= 200),
  ADD CONSTRAINT chk_city_len CHECK (length(city) <= 100),
  ADD CONSTRAINT chk_state_len CHECK (length(state) <= 100),
  ADD CONSTRAINT chk_zip_len CHECK (length(zip_code) <= 20),
  ADD CONSTRAINT chk_country_len CHECK (length(country) <= 100);

-- Book Reviews
ALTER TABLE public.book_reviews
  ADD CONSTRAINT chk_review_text_len CHECK (length(review_text) <= 2000),
  ADD CONSTRAINT chk_reviewer_note_len CHECK (length(reviewer_note) <= 500);

-- Lottery Winners
ALTER TABLE public.lottery_winners
  ADD CONSTRAINT chk_shipping_name_len CHECK (length(shipping_name) <= 200),
  ADD CONSTRAINT chk_shipping_address_len CHECK (length(shipping_address) <= 500),
  ADD CONSTRAINT chk_book_chosen_len CHECK (length(book_chosen) <= 100);

-- Lottery Config
ALTER TABLE public.lottery_config
  ADD CONSTRAINT chk_prize_desc_len CHECK (length(prize_description) <= 500);

-- Admin Audit Log
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT chk_audit_action_len CHECK (length(action) <= 100),
  ADD CONSTRAINT chk_audit_target_type_len CHECK (length(target_type) <= 50);
