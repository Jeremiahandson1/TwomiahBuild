-- Prisma Initial Migration
-- Generated from schema.prisma

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "slug" TEXT NOT NULL UNIQUE,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#0369a1',
    "secondary_color" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "license_number" TEXT,
    "npi" TEXT,
    "medicaid_id" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "stripe_customer_id" TEXT UNIQUE,
    "subscription_tier" TEXT,
    "twilio_phone_number" TEXT,
    "twilio_account_sid" TEXT,
    "twilio_auth_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'caregiver',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "certifications" TEXT[] NOT NULL,
    "certifications_expiry" TIMESTAMP(3)[] NOT NULL,
    "default_pay_rate" DECIMAL(8,2),
    "hire_date" DATE,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "last_login" TIMESTAMP(3),
    "refresh_token" TEXT,
    "reset_token" TEXT,
    "reset_token_exp" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_profiles" (
    "id" TEXT NOT NULL,
    "caregiver_id" TEXT NOT NULL UNIQUE,
    "notes" TEXT,
    "capabilities" TEXT,
    "limitations" TEXT,
    "preferred_hours" TEXT,
    "available_mon" BOOLEAN NOT NULL DEFAULT true,
    "available_tue" BOOLEAN NOT NULL DEFAULT true,
    "available_wed" BOOLEAN NOT NULL DEFAULT true,
    "available_thu" BOOLEAN NOT NULL DEFAULT true,
    "available_fri" BOOLEAN NOT NULL DEFAULT true,
    "available_sat" BOOLEAN NOT NULL DEFAULT false,
    "available_sun" BOOLEAN NOT NULL DEFAULT false,
    "npi_number" TEXT,
    "taxonomy_code" TEXT DEFAULT '374700000X',
    "evv_worker_id" TEXT,
    "medicaid_provider_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caregiver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_availability" (
    "id" TEXT NOT NULL,
    "caregiver_id" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'available',
    "max_hours_per_week" INTEGER NOT NULL DEFAULT 40,
    "weekly_availability" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caregiver_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_schedules" (
    "id" TEXT NOT NULL,
    "caregiver_id" TEXT NOT NULL,
    "day_of_week" INTEGER,
    "date" DATE,
    "start_time" TIME,
    "end_time" TIME,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "max_hours_per_week" INTEGER NOT NULL DEFAULT 40,
    "overtime_approved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caregiver_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_time_off" (
    "id" TEXT NOT NULL,
    "caregiver_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "approved_by_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caregiver_time_off_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "contact_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "payer_type" TEXT DEFAULT 'other',
    "payer_id_number" TEXT,
    "npi" TEXT,
    "expected_pay_days" INTEGER DEFAULT 30,
    "is_active_payer" BOOLEAN NOT NULL DEFAULT false,
    "edi_payer_id" TEXT,
    "submission_method" TEXT DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "ssn_encrypted" TEXT,
    "gender" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "referred_by_id" TEXT,
    "referral_date" DATE,
    "start_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "service_type" TEXT,
    "insurance_provider" TEXT,
    "insurance_id" TEXT,
    "insurance_group" TEXT,
    "medical_conditions" TEXT[] NOT NULL,
    "allergies" TEXT[] NOT NULL,
    "medications" TEXT[] NOT NULL,
    "preferred_caregivers" TEXT[] NOT NULL,
    "do_not_use_caregivers" TEXT[] NOT NULL,
    "notes" TEXT,
    "evv_client_id" TEXT,
    "mco_member_id" TEXT,
    "primary_diagnosis_code" TEXT,
    "secondary_diagnosis_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_emergency_contacts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_onboarding" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL UNIQUE,
    "emergency_contacts_completed" BOOLEAN NOT NULL DEFAULT false,
    "medical_history_completed" BOOLEAN NOT NULL DEFAULT false,
    "insurance_info_completed" BOOLEAN NOT NULL DEFAULT false,
    "care_preferences_completed" BOOLEAN NOT NULL DEFAULT false,
    "family_communication_completed" BOOLEAN NOT NULL DEFAULT false,
    "initial_assessment_completed" BOOLEAN NOT NULL DEFAULT false,
    "all_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_assignments" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "caregiver_id" TEXT NOT NULL,
    "assignment_date" DATE NOT NULL,
    "hours_per_week" DECIMAL(5,2),
    "pay_rate" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "caregiver_id" TEXT,
    "title" TEXT,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "effective_date" DATE,
    "anchor_date" DATE,
    "schedule_type" TEXT NOT NULL DEFAULT 'recurring',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "day_of_week" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "open_shifts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "date" DATE NOT NULL,
    "start_time" TIME,
    "end_time" TIME,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "source_absence_id" TEXT,
    "notified_caregiver_count" INTEGER NOT NULL DEFAULT 0,
    "auto_created" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "open_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "open_shift_notifications" (
    "id" TEXT NOT NULL,
    "open_shift_id" TEXT NOT NULL,
    "caregiver_id" TEXT NOT NULL,
    "notified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notification_type" TEXT NOT NULL DEFAULT 'push',

    CONSTRAINT "open_shift_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absences" (
    "id" TEXT NOT NULL,
    "caregiver_id" TEXT NOT NULL,
    "client_id" TEXT,
    "date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "reported_by_id" TEXT,
    "coverage_needed" BOOLEAN NOT NULL DEFAULT true,
    "coverage_assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "caregiver_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "schedule_id" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "allotted_minutes" INTEGER,
    "billable_minutes" INTEGER,
    "discrepancy_minutes" INTEGER,
    "clock_in_location" JSONB,
    "clock_out_location" JSONB,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_tracking" (
    "id" TEXT NOT NULL,
    "caregiver_id" TEXT NOT NULL,
    "time_entry_id" TEXT,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "accuracy" INTEGER,
    "speed" DECIMAL(6,2),
    "heading" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geofence_settings" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL UNIQUE,
    "radius_feet" INTEGER NOT NULL DEFAULT 300,
    "auto_clock_in" BOOLEAN NOT NULL DEFAULT true,
    "auto_clock_out" BOOLEAN NOT NULL DEFAULT true,
    "require_gps" BOOLEAN NOT NULL DEFAULT true,
    "notify_admin_on_override" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geofence_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "modifier1" TEXT,
    "modifier2" TEXT,
    "description" TEXT NOT NULL,
    "service_category" TEXT,
    "payer_type" TEXT NOT NULL DEFAULT 'all',
    "unit_type" TEXT NOT NULL DEFAULT '15min',
    "rate_per_unit" DECIMAL(8,4),
    "requires_evv" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorizations" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "payer_id" TEXT,
    "auth_number" TEXT,
    "midas_auth_id" TEXT,
    "procedure_code" TEXT,
    "modifier" TEXT,
    "authorized_units" DECIMAL(10,2) NOT NULL,
    "unit_type" TEXT NOT NULL DEFAULT '15min',
    "used_units" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "low_units_alert_threshold" DECIMAL(10,2) NOT NULL DEFAULT 20,
    "notes" TEXT,
    "imported_from" TEXT NOT NULL DEFAULT 'manual',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evv_visits" (
    "id" TEXT NOT NULL,
    "time_entry_id" TEXT NOT NULL UNIQUE,
    "client_id" TEXT NOT NULL,
    "caregiver_id" TEXT NOT NULL,
    "authorization_id" TEXT,
    "service_code" TEXT,
    "modifier" TEXT,
    "service_date" DATE NOT NULL,
    "actual_start" TIMESTAMP(3) NOT NULL,
    "actual_end" TIMESTAMP(3),
    "units_of_service" DECIMAL(8,2),
    "gps_in_lat" DECIMAL(10,7),
    "gps_in_lng" DECIMAL(10,7),
    "gps_out_lat" DECIMAL(10,7),
    "gps_out_lng" DECIMAL(10,7),
    "sandata_status" TEXT NOT NULL DEFAULT 'pending',
    "sandata_visit_id" TEXT,
    "sandata_submitted_at" TIMESTAMP(3),
    "sandata_response" JSONB,
    "sandata_exception_code" TEXT,
    "sandata_exception_desc" TEXT,
    "evv_method" TEXT NOT NULL DEFAULT 'gps',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_issues" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evv_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_log" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "validation_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "details" JSONB,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL UNIQUE,
    "client_id" TEXT NOT NULL,
    "billing_period_start" DATE NOT NULL,
    "billing_period_end" DATE NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "payment_due_date" DATE,
    "payment_date" DATE,
    "payment_method" TEXT,
    "stripe_payment_intent_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "time_entry_id" TEXT,
    "caregiver_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hours" DECIMAL(6,2) NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edi_batches" (
    "id" TEXT NOT NULL,
    "payer_id" TEXT,
    "batch_number" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "claim_count" INTEGER NOT NULL DEFAULT 0,
    "total_billed" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "edi_content" TEXT,
    "submitted_at" TIMESTAMP(3),
    "response_code" TEXT,
    "response_message" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edi_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "caregiver_id" TEXT,
    "edi_batch_id" TEXT,
    "evv_visit_id" TEXT,
    "authorization_id" TEXT,
    "claim_number" TEXT,
    "service_date" DATE,
    "service_code" TEXT,
    "billed_amount" DECIMAL(10,2),
    "allowed_amount" DECIMAL(10,2),
    "paid_amount" DECIMAL(10,2),
    "denial_code" TEXT,
    "denial_reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submission_date" DATE,
    "paid_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remittance_batches" (
    "id" TEXT NOT NULL,
    "payer_id" TEXT,
    "payer_name" TEXT NOT NULL,
    "payer_type" TEXT NOT NULL DEFAULT 'other',
    "check_number" TEXT,
    "check_date" DATE,
    "payment_date" DATE,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "raw_ocr_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_match',
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remittance_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remittance_line_items" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "client_id" TEXT,
    "invoice_id" TEXT,
    "claim_id" TEXT,
    "claim_number" TEXT,
    "service_date_from" DATE,
    "service_date_to" DATE,
    "billed_amount" DECIMAL(10,2),
    "allowed_amount" DECIMAL(10,2),
    "paid_amount" DECIMAL(10,2) NOT NULL,
    "adjustment_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "denial_code" TEXT,
    "denial_reason" TEXT,
    "match_status" TEXT NOT NULL DEFAULT 'unmatched',
    "matched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remittance_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gusto_sync_log" (
    "id" TEXT NOT NULL,
    "sync_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pay_period_start" DATE,
    "pay_period_end" DATE,
    "records_exported" INTEGER NOT NULL DEFAULT 0,
    "gusto_response" JSONB,
    "error_message" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gusto_sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gusto_employee_map" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL UNIQUE,
    "gusto_employee_id" TEXT,
    "gusto_uuid" TEXT,
    "is_synced" BOOLEAN NOT NULL DEFAULT false,
    "last_synced_at" TIMESTAMP(3),

    CONSTRAINT "gusto_employee_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "receipt_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_ratings" (
    "id" TEXT NOT NULL,
    "caregiver_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "rating_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "satisfaction_score" INTEGER,
    "punctuality_score" INTEGER,
    "professionalism_score" INTEGER,
    "care_quality_score" INTEGER,
    "comments" TEXT,
    "no_shows" INTEGER NOT NULL DEFAULT 0,
    "late_arrivals" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_checks" (
    "id" TEXT NOT NULL,
    "caregiver_id" TEXT NOT NULL,
    "check_type" TEXT NOT NULL DEFAULT 'criminal',
    "provider" TEXT,
    "cost" DECIMAL(8,2),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "initiated_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiration_date" DATE,
    "worcs_reference_number" TEXT,
    "worcs_status" TEXT,
    "ssn_encrypted" TEXT,
    "drivers_license_encrypted" TEXT,
    "drivers_license_state" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "background_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "push_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL UNIQUE,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "schedule_alerts" BOOLEAN NOT NULL DEFAULT true,
    "absence_alerts" BOOLEAN NOT NULL DEFAULT true,
    "billing_alerts" BOOLEAN NOT NULL DEFAULT true,
    "rating_alerts" BOOLEAN NOT NULL DEFAULT true,
    "daily_digest" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_threads" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "thread_type" TEXT NOT NULL DEFAULT 'direct',
    "is_broadcast" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_thread_participants" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "last_read_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_thread_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_log" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "log_type" TEXT NOT NULL DEFAULT 'note',
    "direction" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "logged_by_id" TEXT,
    "logged_by_name" TEXT,
    "client_id" TEXT,
    "follow_up_date" DATE,
    "follow_up_done" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noshow_alert_config" (
    "id" TEXT NOT NULL,
    "grace_minutes" INTEGER NOT NULL DEFAULT 15,
    "notify_admin" BOOLEAN NOT NULL DEFAULT true,
    "notify_caregiver" BOOLEAN NOT NULL DEFAULT true,
    "notify_client_family" BOOLEAN NOT NULL DEFAULT false,
    "admin_phone" TEXT,
    "admin_email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "noshow_alert_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noshow_alerts" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT,
    "caregiver_id" TEXT,
    "client_id" TEXT,
    "shift_date" DATE NOT NULL,
    "expected_start" TIME NOT NULL,
    "alerted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "resolution_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "sms_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "noshow_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "fields" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "requires_signature" BOOLEAN NOT NULL DEFAULT false,
    "auto_attach_to" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "template_id" TEXT,
    "template_name" TEXT,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "client_id" TEXT,
    "submitted_by_id" TEXT,
    "submitted_by_name" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "signature" TEXT,
    "signed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_activity" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "fail_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "table_name" TEXT,
    "record_id" TEXT,
    "old_data" JSONB,
    "new_data" JSONB,
    "ip_address" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "service_radius_miles" INTEGER NOT NULL DEFAULT 5,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_cache" (
    "id" TEXT NOT NULL,
    "cache_key" TEXT NOT NULL UNIQUE,
    "data" JSONB,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_cache_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "caregiver_schedules_caregiver_id_idx" ON "caregiver_schedules"("caregiver_id");
CREATE INDEX "caregiver_schedules_date_idx" ON "caregiver_schedules"("date");

CREATE INDEX "caregiver_time_off_caregiver_id_idx" ON "caregiver_time_off"("caregiver_id");
CREATE INDEX "caregiver_time_off_start_date_end_date_idx" ON "caregiver_time_off"("start_date", "end_date");

CREATE INDEX "referral_sources_type_idx" ON "referral_sources"("type");
CREATE INDEX "referral_sources_is_active_idx" ON "referral_sources"("is_active");

CREATE INDEX "clients_is_active_idx" ON "clients"("is_active");
CREATE INDEX "clients_referred_by_id_idx" ON "clients"("referred_by_id");

CREATE INDEX "client_emergency_contacts_client_id_idx" ON "client_emergency_contacts"("client_id");

CREATE INDEX "client_assignments_client_id_idx" ON "client_assignments"("client_id");
CREATE INDEX "client_assignments_caregiver_id_idx" ON "client_assignments"("caregiver_id");
CREATE INDEX "client_assignments_status_idx" ON "client_assignments"("status");

CREATE INDEX "schedules_client_id_idx" ON "schedules"("client_id");
CREATE INDEX "schedules_caregiver_id_idx" ON "schedules"("caregiver_id");

CREATE INDEX "open_shifts_date_idx" ON "open_shifts"("date");
CREATE INDEX "open_shifts_status_idx" ON "open_shifts"("status");

CREATE UNIQUE INDEX "open_shift_notifications_open_shift_id_caregiver_id_key" ON "open_shift_notifications"("open_shift_id", "caregiver_id");
CREATE INDEX "open_shift_notifications_open_shift_id_idx" ON "open_shift_notifications"("open_shift_id");

CREATE INDEX "absences_caregiver_id_idx" ON "absences"("caregiver_id");
CREATE INDEX "absences_date_idx" ON "absences"("date");

CREATE INDEX "time_entries_caregiver_id_idx" ON "time_entries"("caregiver_id");
CREATE INDEX "time_entries_client_id_idx" ON "time_entries"("client_id");
CREATE INDEX "time_entries_start_time_idx" ON "time_entries"("start_time");
CREATE INDEX "time_entries_schedule_id_idx" ON "time_entries"("schedule_id");

CREATE INDEX "gps_tracking_caregiver_id_idx" ON "gps_tracking"("caregiver_id");
CREATE INDEX "gps_tracking_time_entry_id_idx" ON "gps_tracking"("time_entry_id");
CREATE INDEX "gps_tracking_timestamp_idx" ON "gps_tracking"("timestamp");

CREATE INDEX "service_codes_code_idx" ON "service_codes"("code");
CREATE INDEX "service_codes_is_active_idx" ON "service_codes"("is_active");

CREATE INDEX "authorizations_client_id_idx" ON "authorizations"("client_id");
CREATE INDEX "authorizations_start_date_end_date_idx" ON "authorizations"("start_date", "end_date");
CREATE INDEX "authorizations_status_idx" ON "authorizations"("status");

CREATE INDEX "evv_visits_client_id_service_date_idx" ON "evv_visits"("client_id", "service_date");
CREATE INDEX "evv_visits_caregiver_id_idx" ON "evv_visits"("caregiver_id");
CREATE INDEX "evv_visits_sandata_status_idx" ON "evv_visits"("sandata_status");

CREATE INDEX "validation_log_entity_id_entity_type_idx" ON "validation_log"("entity_id", "entity_type");

CREATE INDEX "invoices_client_id_idx" ON "invoices"("client_id");
CREATE INDEX "invoices_payment_status_idx" ON "invoices"("payment_status");

CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

CREATE INDEX "edi_batches_status_idx" ON "edi_batches"("status");

CREATE INDEX "claims_edi_batch_id_idx" ON "claims"("edi_batch_id");
CREATE INDEX "claims_evv_visit_id_idx" ON "claims"("evv_visit_id");
CREATE INDEX "claims_status_idx" ON "claims"("status");

CREATE INDEX "remittance_batches_payer_id_idx" ON "remittance_batches"("payer_id");

CREATE INDEX "remittance_line_items_batch_id_idx" ON "remittance_line_items"("batch_id");

CREATE INDEX "expenses_user_id_idx" ON "expenses"("user_id");

CREATE INDEX "performance_ratings_caregiver_id_idx" ON "performance_ratings"("caregiver_id");
CREATE INDEX "performance_ratings_client_id_idx" ON "performance_ratings"("client_id");

CREATE INDEX "background_checks_caregiver_id_idx" ON "background_checks"("caregiver_id");

CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

CREATE UNIQUE INDEX "push_subscriptions_user_id_subscription_key" ON "push_subscriptions"("user_id", "subscription");
CREATE INDEX "push_subscriptions_is_active_idx" ON "push_subscriptions"("is_active");

CREATE INDEX "message_threads_updated_at_idx" ON "message_threads"("updated_at");

CREATE UNIQUE INDEX "message_thread_participants_thread_id_user_id_key" ON "message_thread_participants"("thread_id", "user_id");
CREATE INDEX "message_thread_participants_user_id_idx" ON "message_thread_participants"("user_id");
CREATE INDEX "message_thread_participants_thread_id_idx" ON "message_thread_participants"("thread_id");

CREATE INDEX "messages_thread_id_created_at_idx" ON "messages"("thread_id", "created_at");

CREATE INDEX "communication_log_entity_type_entity_id_idx" ON "communication_log"("entity_type", "entity_id");
CREATE INDEX "communication_log_created_at_idx" ON "communication_log"("created_at");

CREATE INDEX "noshow_alerts_status_shift_date_idx" ON "noshow_alerts"("status", "shift_date");
CREATE INDEX "noshow_alerts_caregiver_id_idx" ON "noshow_alerts"("caregiver_id");

CREATE INDEX "form_templates_category_is_active_idx" ON "form_templates"("category", "is_active");

CREATE INDEX "form_submissions_entity_type_entity_id_idx" ON "form_submissions"("entity_type", "entity_id");
CREATE INDEX "form_submissions_template_id_idx" ON "form_submissions"("template_id");

CREATE INDEX "login_activity_email_idx" ON "login_activity"("email");
CREATE INDEX "login_activity_user_id_idx" ON "login_activity"("user_id");
CREATE INDEX "login_activity_created_at_idx" ON "login_activity"("created_at");

CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");
CREATE INDEX "audit_logs_table_name_idx" ON "audit_logs"("table_name");
