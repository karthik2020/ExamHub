-- =====================================================================
-- Migration 00002: Harden Attempts and Attempt Answers Security
-- Least-Privilege Column Grants, Granular RLS, and Defensive Triggers
-- =====================================================================

-- 1. REVOKE BROAD PERMISSIONS FROM AUTHENTICATED ROLE
-- Previously: GRANT ALL ON attempts TO authenticated;
-- Previously: GRANT ALL ON attempt_answers TO authenticated;
REVOKE ALL ON attempts FROM authenticated;
REVOKE ALL ON attempt_answers FROM authenticated;

-- Grant minimal required permissions: SELECT and INSERT on attempts
GRANT SELECT ON attempts TO authenticated;
GRANT INSERT ON attempts TO authenticated;

-- Column-level UPDATE privileges on attempts (Least Privilege):
-- Only non-authoritative candidate state columns can be updated by authenticated students.
-- Authoritative fields (score, percentage, correct_count, incorrect_count, skipped_count,
-- max_score, submitted_at, status, tenant_id, user_id) are strictly prohibited from student UPDATE.
GRANT UPDATE (
    time_spent_seconds
) ON attempts TO authenticated;

-- Permissions on attempt_answers:
GRANT SELECT ON attempt_answers TO authenticated;
GRANT INSERT ON attempt_answers TO authenticated;

-- Column-level UPDATE privileges on attempt_answers (Least Privilege):
-- Only candidate answers and elapsed time can be updated by authenticated students.
-- Authoritative evaluation fields (is_correct, marks_awarded) cannot be updated by students.
GRANT UPDATE (
    selected_answer,
    time_spent_seconds,
    answered_at
) ON attempt_answers TO authenticated;


-- 2. HARDEN ROW LEVEL SECURITY (RLS) POLICIES
-- Drop prior broad "FOR ALL" policies
DROP POLICY IF EXISTS "Users access their own attempts" ON attempts;
DROP POLICY IF EXISTS "Users access their own attempt answers" ON attempt_answers;

-- Granular RLS for attempts
CREATE POLICY "Users can view their own attempts"
    ON attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts"
    ON attempts FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND (status IS NULL OR status = 'IN_PROGRESS')
        AND score IS NULL
        AND percentage IS NULL
        AND correct_count IS NULL
        AND incorrect_count IS NULL
        AND skipped_count IS NULL
        AND submitted_at IS NULL
    );

CREATE POLICY "Users can update their own in-progress attempts"
    ON attempts FOR UPDATE
    USING (
        auth.uid() = user_id 
        AND status = 'IN_PROGRESS'
    )
    WITH CHECK (
        auth.uid() = user_id 
        AND status = 'IN_PROGRESS'
    );

-- Granular RLS for attempt_answers
CREATE POLICY "Users can view their own attempt answers"
    ON attempt_answers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM attempts 
            WHERE attempts.id = attempt_answers.attempt_id 
            AND attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert answers for their own in-progress attempts"
    ON attempt_answers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM attempts 
            WHERE attempts.id = attempt_answers.attempt_id 
            AND attempts.user_id = auth.uid()
            AND attempts.status = 'IN_PROGRESS'
        )
        AND is_correct IS NULL
        AND marks_awarded IS NULL
    );

CREATE POLICY "Users can update answers for their own in-progress attempts"
    ON attempt_answers FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM attempts 
            WHERE attempts.id = attempt_answers.attempt_id 
            AND attempts.user_id = auth.uid()
            AND attempts.status = 'IN_PROGRESS'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM attempts 
            WHERE attempts.id = attempt_answers.attempt_id 
            AND attempts.user_id = auth.uid()
            AND attempts.status = 'IN_PROGRESS'
        )
    );


-- 3. DEFENSE-IN-DEPTH IMMUTABILITY TRIGGERS
-- Protect authoritative fields from direct modification by non-admin roles

CREATE OR REPLACE FUNCTION protect_attempt_authoritative_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Only enforce restrictions for authenticated client sessions (service_role / superuser bypass)
    IF CURRENT_USER = 'authenticated' OR SESSION_USER = 'authenticated' THEN
        IF NEW.score IS DISTINCT FROM OLD.score THEN
            RAISE EXCEPTION 'Modifying attempt score is restricted to server authority (column: score).';
        END IF;
        IF NEW.percentage IS DISTINCT FROM OLD.percentage THEN
            RAISE EXCEPTION 'Modifying attempt percentage is restricted to server authority (column: percentage).';
        END IF;
        IF NEW.correct_count IS DISTINCT FROM OLD.correct_count THEN
            RAISE EXCEPTION 'Modifying attempt correct_count is restricted to server authority (column: correct_count).';
        END IF;
        IF NEW.incorrect_count IS DISTINCT FROM OLD.incorrect_count THEN
            RAISE EXCEPTION 'Modifying attempt incorrect_count is restricted to server authority (column: incorrect_count).';
        END IF;
        IF NEW.skipped_count IS DISTINCT FROM OLD.skipped_count THEN
            RAISE EXCEPTION 'Modifying attempt skipped_count is restricted to server authority (column: skipped_count).';
        END IF;
        IF NEW.max_score IS DISTINCT FROM OLD.max_score THEN
            RAISE EXCEPTION 'Modifying attempt max_score is restricted to server authority (column: max_score).';
        END IF;
        IF NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
            RAISE EXCEPTION 'Modifying attempt submitted_at is restricted to server authority (column: submitted_at).';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Modifying attempt status is restricted to server authority (column: status).';
        END IF;
        IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
            RAISE EXCEPTION 'Modifying attempt user_id is prohibited (column: user_id).';
        END IF;
        IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
            RAISE EXCEPTION 'Modifying attempt tenant_id is prohibited (column: tenant_id).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_attempt_authoritative_fields ON attempts;
CREATE TRIGGER trg_protect_attempt_authoritative_fields
BEFORE UPDATE ON attempts
FOR EACH ROW
EXECUTE FUNCTION protect_attempt_authoritative_fields();


CREATE OR REPLACE FUNCTION protect_attempt_answers_authoritative_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF CURRENT_USER = 'authenticated' OR SESSION_USER = 'authenticated' THEN
        IF NEW.is_correct IS DISTINCT FROM OLD.is_correct THEN
            RAISE EXCEPTION 'Modifying attempt answer is_correct is restricted to server authority (column: is_correct).';
        END IF;
        IF NEW.marks_awarded IS DISTINCT FROM OLD.marks_awarded THEN
            RAISE EXCEPTION 'Modifying attempt answer marks_awarded is restricted to server authority (column: marks_awarded).';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_attempt_answers_authoritative_fields ON attempt_answers;
CREATE TRIGGER trg_protect_attempt_answers_authoritative_fields
BEFORE UPDATE ON attempt_answers
FOR EACH ROW
EXECUTE FUNCTION protect_attempt_answers_authoritative_fields();
