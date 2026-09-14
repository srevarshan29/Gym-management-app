--
-- PostgreSQL database dump
--

\restrict Cl5lorA2LITur3zmlg5WOUzc1kdFu7k1L38kAklNYOtH9KK3tvGdsuW7x5fqwMt

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11

-- Started on 2026-09-08 14:04:57

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 19 (class 2615 OID 16498)
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- TOC entry 14 (class 2615 OID 16392)
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- TOC entry 18 (class 2615 OID 16578)
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- TOC entry 17 (class 2615 OID 16567)
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- TOC entry 9 (class 2615 OID 16390)
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- TOC entry 15 (class 2615 OID 16559)
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- TOC entry 20 (class 2615 OID 16546)
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- TOC entry 16 (class 2615 OID 16607)
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- TOC entry 4 (class 3079 OID 16393)
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- TOC entry 4519 (class 0 OID 0)
-- Dependencies: 4
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- TOC entry 2 (class 3079 OID 16447)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- TOC entry 4520 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 5 (class 3079 OID 16608)
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- TOC entry 4521 (class 0 OID 0)
-- Dependencies: 5
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- TOC entry 3 (class 3079 OID 16436)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- TOC entry 4522 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 1064 (class 1247 OID 16744)
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- TOC entry 1088 (class 1247 OID 16885)
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- TOC entry 1061 (class 1247 OID 16738)
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- TOC entry 1058 (class 1247 OID 16732)
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- TOC entry 1106 (class 1247 OID 16988)
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- TOC entry 1118 (class 1247 OID 17061)
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- TOC entry 1100 (class 1247 OID 16966)
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- TOC entry 1109 (class 1247 OID 16998)
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- TOC entry 1094 (class 1247 OID 16927)
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- TOC entry 1172 (class 1247 OID 17624)
-- Name: DurationUnit; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DurationUnit" AS ENUM (
    'MONTHS',
    'DAYS'
);


--
-- TOC entry 1277 (class 1247 OID 30639)
-- Name: ExerciseTrackingType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExerciseTrackingType" AS ENUM (
    'WEIGHTED',
    'TIME',
    'BODYWEIGHT'
);


--
-- TOC entry 1253 (class 1247 OID 30506)
-- Name: FitnessGoal; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FitnessGoal" AS ENUM (
    'WEIGHT_LOSS',
    'MUSCLE_GAIN',
    'GENERAL_FITNESS',
    'STRENGTH_TRAINING',
    'ENDURANCE'
);


--
-- TOC entry 1247 (class 1247 OID 30445)
-- Name: LedgerTransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LedgerTransactionType" AS ENUM (
    'INCOME',
    'EXPENSE'
);


--
-- TOC entry 1220 (class 1247 OID 19687)
-- Name: MemberGender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MemberGender" AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER',
    'PREFER_NOT_TO_SAY'
);


--
-- TOC entry 1256 (class 1247 OID 30518)
-- Name: MuscleGroup; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MuscleGroup" AS ENUM (
    'CHEST',
    'BACK',
    'LEGS',
    'SHOULDERS',
    'ARMS',
    'CORE'
);


--
-- TOC entry 1175 (class 1247 OID 17630)
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'UPI',
    'CARD',
    'OTHER',
    'BANK_TRANSFER'
);


--
-- TOC entry 1169 (class 1247 OID 17617)
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'OWNER',
    'ADMIN',
    'STAFF',
    'SUPER_ADMIN'
);


--
-- TOC entry 1229 (class 1247 OID 23752)
-- Name: VisitorSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VisitorSource" AS ENUM (
    'walk_in',
    'qr_registration'
);


--
-- TOC entry 1226 (class 1247 OID 23745)
-- Name: VisitorStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VisitorStatus" AS ENUM (
    'pending',
    'converted'
);


--
-- TOC entry 1232 (class 1247 OID 23773)
-- Name: WorkoutLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkoutLevel" AS ENUM (
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED'
);


--
-- TOC entry 1265 (class 1247 OID 30572)
-- Name: WorkoutSessionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkoutSessionStatus" AS ENUM (
    'IN_PROGRESS',
    'COMPLETED'
);


--
-- TOC entry 1205 (class 1247 OID 17218)
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- TOC entry 1208 (class 1247 OID 17179)
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in',
    'like',
    'ilike',
    'is',
    'match',
    'imatch',
    'isdistinct'
);


--
-- TOC entry 1211 (class 1247 OID 17193)
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text,
	negate boolean
);


--
-- TOC entry 1214 (class 1247 OID 17260)
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- TOC entry 1217 (class 1247 OID 17231)
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- TOC entry 1154 (class 1247 OID 17519)
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- TOC entry 363 (class 1255 OID 16544)
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- TOC entry 4523 (class 0 OID 0)
-- Dependencies: 363
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- TOC entry 376 (class 1255 OID 16714)
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- TOC entry 362 (class 1255 OID 16543)
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- TOC entry 4524 (class 0 OID 0)
-- Dependencies: 362
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- TOC entry 361 (class 1255 OID 16542)
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- TOC entry 4525 (class 0 OID 0)
-- Dependencies: 361
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- TOC entry 364 (class 1255 OID 16551)
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
    revoke trigger on cron.job_run_details from postgres;
  END IF;
END;
$$;


--
-- TOC entry 4526 (class 0 OID 0)
-- Dependencies: 364
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- TOC entry 368 (class 1255 OID 16572)
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $_$
begin
    if not exists (
        select 1
        from pg_catalog.pg_event_trigger_ddl_commands() ev
        join pg_catalog.pg_extension e on ev.objid = e.oid
        where e.extname = 'pg_graphql'
    ) then
        return;
    end if;

    drop function if exists graphql_public.graphql;
    create or replace function graphql_public.graphql(
        "operationName" text default null,
        query text default null,
        variables jsonb default null,
        extensions jsonb default null
    )
        returns jsonb
        language sql
    as $$
        select graphql.resolve(
            query := query,
            variables := coalesce(variables, '{}'),
            "operationName" := "operationName",
            extensions := extensions
        );
    $$;

    -- Attach the wrapper to the extension so DROP EXTENSION cascades to it,
    -- which in turn triggers set_graphql_placeholder to reinstall the "not enabled" stub.
    alter extension pg_graphql add function graphql_public.graphql(text, text, jsonb, jsonb);

    grant usage on schema graphql to postgres, anon, authenticated, service_role;
    grant execute on function graphql.resolve to postgres, anon, authenticated, service_role;
    grant usage on schema graphql to postgres with grant option;
    grant usage on schema graphql_public to postgres with grant option;
end;
$_$;


--
-- TOC entry 4527 (class 0 OID 0)
-- Dependencies: 368
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- TOC entry 365 (class 1255 OID 16553)
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8.0', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- TOC entry 4528 (class 0 OID 0)
-- Dependencies: 365
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- TOC entry 366 (class 1255 OID 16563)
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- TOC entry 367 (class 1255 OID 16564)
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- TOC entry 369 (class 1255 OID 16574)
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
            set search_path to ''
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- TOC entry 4529 (class 0 OID 0)
-- Dependencies: 369
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- TOC entry 375 (class 1255 OID 16665)
-- Name: graphql(text, text, jsonb, jsonb); Type: FUNCTION; Schema: graphql_public; Owner: -
--

CREATE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


--
-- TOC entry 311 (class 1255 OID 16391)
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- TOC entry 409 (class 1255 OID 19652)
-- Name: app_current_gym_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.app_current_gym_id() RETURNS text
    LANGUAGE sql STABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$
  SELECT NULLIF(current_setting('app.gym_id', true), '');
$$;


--
-- TOC entry 411 (class 1255 OID 19654)
-- Name: app_is_platform_lookup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.app_is_platform_lookup() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(current_setting('app.platform_lookup', true), 'false') = 'true';
$$;


--
-- TOC entry 410 (class 1255 OID 19653)
-- Name: app_is_super_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.app_is_super_admin() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(current_setting('app.is_super_admin', true), 'false') = 'true';
$$;


--
-- TOC entry 382 (class 1255 OID 17253)
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
    -- Regclass of the table e.g. public.notes
    entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

    -- I, U, D, T: insert, update ...
    action realtime.action = (
        case wal ->> 'action'
            when 'I' then 'INSERT'
            when 'U' then 'UPDATE'
            when 'D' then 'DELETE'
            else 'ERROR'
        end
    );

    -- Is row level security enabled for the table
    is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

    subscriptions realtime.subscription[] = array_agg(subs)
        from
            realtime.subscription subs
        where
            subs.entity = entity_
            -- Filter by action early - only get subscriptions interested in this action
            -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
            and (subs.action_filter = '*' or subs.action_filter = action::text);

    -- Subscription vars
    working_role regrole;
    working_selected_columns text[];
    claimed_role regrole;
    claims jsonb;

    subscription_id uuid;
    subscription_has_access bool;
    visible_to_subscription_ids uuid[] = '{}';

    -- structured info for wal's columns
    columns realtime.wal_column[];
    -- previous identity values for update/delete
    old_columns realtime.wal_column[];

    error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

    -- Primary jsonb output for record
    output jsonb;

    -- Loop record for iterating unique roles (outer loop)
    role_record record;
    -- Loop record for iterating unique selected_columns within a role (inner loop)
    cols_record record;
    -- Subscription ids visible at the role level (before fanning out by selected_columns)
    visible_role_sub_ids uuid[] = '{}';

begin
    perform set_config('role', null, true);

    columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'columns') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    old_columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'identity') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    for role_record in
        select claims_role
        from (select distinct claims_role from unnest(subscriptions)) t
        order by claims_role::text
    loop
        working_role := role_record.claims_role;

        -- Update `is_selectable` for columns and old_columns (once per role)
        columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(columns) c;

        old_columns =
                array_agg(
                    (
                        c.name,
                        c.type_name,
                        c.type_oid,
                        c.value,
                        c.is_pkey,
                        pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                    )::realtime.wal_column
                )
                from
                    unnest(old_columns) c;

        if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
            -- Fan out 400 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 400: Bad Request, no primary key']
                )::realtime.wal_rls;
            end loop;

        -- The claims role does not have SELECT permission to the primary key of entity
        elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
            -- Fan out 401 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 401: Unauthorized']
                )::realtime.wal_rls;
            end loop;

        else
            -- Create the prepared statement (once per role)
            if is_rls_enabled and action <> 'DELETE' then
                if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                    deallocate walrus_rls_stmt;
                end if;
                execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
            end if;

            -- Collect all visible subscription IDs for this role (filter check + RLS check)
            visible_role_sub_ids = '{}';

            for subscription_id, claims in (
                    select
                        subs.subscription_id,
                        subs.claims
                    from
                        unnest(subscriptions) subs
                    where
                        subs.entity = entity_
                        and subs.claims_role = working_role
                        and (
                            realtime.is_visible_through_filters(columns, subs.filters)
                            or (
                              action = 'DELETE'
                              and realtime.is_visible_through_filters(old_columns, subs.filters)
                            )
                        )
            ) loop

                if not is_rls_enabled or action = 'DELETE' then
                    visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                else
                    -- Check if RLS allows the role to see the record
                    perform
                        -- Trim leading and trailing quotes from working_role because set_config
                        -- doesn't recognize the role as valid if they are included
                        set_config('role', trim(both '"' from working_role::text), true),
                        set_config('request.jwt.claims', claims::text, true);

                    execute 'execute walrus_rls_stmt' into subscription_has_access;

                    -- Reset the role on every FOR..LOOP batch execution.
                    -- The first batch of 10 rows is pre-fetched using the current connection role (PG internal behaviour)
                    -- then we have to reset it again otherwise it would use the role defined in the `set_config` above
                    -- to fetch the remaining rows when rows>10, which could be a user-defined role that lacks execution grants.
                    -- The flow is:
                    --   1. run batch with conn role
                    --   2. set_config working_role
                    --   3. execute walrus
                    --   4. reset role (revert)
                    --   5. repeat
                    perform set_config('role', null, true);

                    if subscription_has_access then
                        visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                    end if;
                end if;
            end loop;

            perform set_config('role', null, true);

            -- Inner loop: per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;

                output = jsonb_build_object(
                    'schema', wal ->> 'schema',
                    'table', wal ->> 'table',
                    'type', action,
                    'commit_timestamp', to_char(
                        ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                    ),
                    'columns', (
                        select
                            jsonb_agg(
                                jsonb_build_object(
                                    'name', pa.attname,
                                    'type', pt.typname
                                )
                                order by pa.attnum asc
                            )
                        from
                            pg_attribute pa
                            join pg_type pt
                                on pa.atttypid = pt.oid
                            left join (
                                select unnest(conkey) as pkey_attnum
                                from pg_constraint
                                where conrelid = entity_ and contype = 'p'
                            ) pk on pk.pkey_attnum = pa.attnum
                        where
                            attrelid = entity_
                            and attnum > 0
                            and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
                            and (working_selected_columns is null or pa.attname = any(working_selected_columns) or pk.pkey_attnum is not null)
                    )
                )
                -- Add "record" key for insert and update
                || case
                    when action in ('INSERT', 'UPDATE') then
                        jsonb_build_object(
                            'record',
                            (
                                select
                                    jsonb_object_agg(
                                        -- if unchanged toast, get column name and value from old record
                                        coalesce((c).name, (oc).name),
                                        case
                                            when (c).name is null then (oc).value
                                            else (c).value
                                        end
                                    )
                                from
                                    unnest(columns) c
                                    full outer join unnest(old_columns) oc
                                        on (c).name = (oc).name
                                where
                                    coalesce((c).is_selectable, (oc).is_selectable)
                                    and (working_selected_columns is null or coalesce((c).name, (oc).name) = any(working_selected_columns) or coalesce((c).is_pkey, (oc).is_pkey))
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            )
                        )
                    else '{}'::jsonb
                end
                -- Add "old_record" key for update and delete
                || case
                    when action = 'UPDATE' then
                        jsonb_build_object(
                                'old_record',
                                (
                                    select jsonb_object_agg((c).name, (c).value)
                                    from unnest(old_columns) c
                                    where
                                        (c).is_selectable
                                        and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                        and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                )
                            )
                    when action = 'DELETE' then
                        jsonb_build_object(
                            'old_record',
                            (
                                select jsonb_object_agg((c).name, (c).value)
                                from unnest(old_columns) c
                                where
                                    (c).is_selectable
                                    and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                    and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                            )
                        )
                    else '{}'::jsonb
                end;

                -- Filter visible_role_sub_ids to those matching the current selected_columns group
                visible_to_subscription_ids = coalesce(
                    (
                        select array_agg(s.subscription_id)
                        from unnest(subscriptions) s
                        where s.claims_role = working_role
                          and (s.selected_columns is not distinct from working_selected_columns)
                          and s.subscription_id = any(visible_role_sub_ids)
                    ),
                    '{}'::uuid[]
                );

                return next (
                    output,
                    is_rls_enabled,
                    visible_to_subscription_ids,
                    case
                        when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                        else '{}'
                    end
                )::realtime.wal_rls;
            end loop;

        end if;
    end loop;

    perform set_config('role', null, true);
end;
$$;


--
-- TOC entry 387 (class 1255 OID 17332)
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- TOC entry 384 (class 1255 OID 17265)
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- TOC entry 380 (class 1255 OID 17215)
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


--
-- TOC entry 379 (class 1255 OID 17210)
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
/*
Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
*/
declare
    op_symbol text = (
        case
            when op = 'eq' then '='
            when op = 'neq' then '!='
            when op = 'lt' then '<'
            when op = 'lte' then '<='
            when op = 'gt' then '>'
            when op = 'gte' then '>='
            when op = 'in' then '= any'
            else 'UNKNOWN OP'
        end
    );
    res boolean;
begin
    execute format(
        'select %L::'|| type_::text || ' ' || op_symbol
        || ' ( %L::'
        || (
            case
                when op = 'in' then type_::text || '[]'
                else type_::text end
        )
        || ')', val_1, val_2) into res;
    return res;
end;
$$;


--
-- TOC entry 408 (class 1255 OID 17600)
-- Name: check_equality_op(realtime.equality_op, regtype, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
declare
    op_symbol text;
    res boolean;
begin
    -- IS DISTINCT FROM / IS NOT DISTINCT FROM: infix, both sides typed literals
    if op = 'isdistinct' then
        execute format(
            'select %L::%s %s %L::%s',
            val_1,
            type_::text,
            case when negate then 'IS NOT DISTINCT FROM' else 'IS DISTINCT FROM' end,
            val_2,
            type_::text
        ) into res;
        return res;
    end if;

    -- IS requires a keyword RHS (NULL, TRUE, FALSE, UNKNOWN), not a typed literal
    if op = 'is' then
        if val_2 not in ('null', 'true', 'false', 'unknown') then
            raise exception 'invalid value for is filter: must be null, true, false, or unknown';
        end if;
        execute format(
            'select %L::%s %s %s',
            val_1,
            type_::text,
            case when negate then 'IS NOT' else 'IS' end,
            upper(val_2)
        ) into res;
        return res;
    end if;

    op_symbol = case
        when op = 'eq'    then '='
        when op = 'neq'   then '!='
        when op = 'lt'    then '<'
        when op = 'lte'   then '<='
        when op = 'gt'    then '>'
        when op = 'gte'   then '>='
        when op = 'in'    then '= any'
        when op = 'like'   then 'LIKE'
        when op = 'ilike'  then 'ILIKE'
        when op = 'match'  then '~'
        when op = 'imatch' then '~*'
        else null
    end;

    if op_symbol is null then
        raise exception 'unsupported equality operator: %', op::text;
    end if;

    execute format(
        'select %L::%s %s (%L::%s)',
        val_1,
        type_::text,
        op_symbol,
        val_2,
        case when op = 'in' then type_::text || '[]' else type_::text end
    ) into res;

    return case when negate then not res else res end;
end;
$$;


--
-- TOC entry 383 (class 1255 OID 17261)
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    select
        filters is null
        or array_length(filters, 1) is null
        or coalesce(
            count(col.name) = count(1)
            and sum(
                realtime.check_equality_op(
                    op:=f.op,
                    type_:=coalesce(col.type_oid::regtype, col.type_name::regtype),
                    val_1:=col.value #>> '{}',
                    val_2:=f.value,
                    negate:=coalesce(f.negate, false)
                )::int
            ) filter (where col.name is not null) = count(col.name),
            false
        )
    from
        unnest(filters) f
        left join unnest(columns) col
            on f.column_name = col.name;
$$;


--
-- TOC entry 389 (class 1255 OID 17368)
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


--
-- TOC entry 378 (class 1255 OID 17209)
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  SELECT
    realtime.wal2json_escape_identifier(nsp.nspname::text)
    || '.'
    || realtime.wal2json_escape_identifier(pc.relname::text)
  FROM pg_class pc
  JOIN pg_namespace nsp ON pc.relnamespace = nsp.oid
  WHERE pc.oid = entity
$$;


--
-- TOC entry 386 (class 1255 OID 17331)
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- TOC entry 390 (class 1255 OID 17369)
-- Name: send_binary(bytea, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, binary_payload, event, topic, private, extension)
    VALUES (generated_id, payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- TOC entry 377 (class 1255 OID 17207)
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    col_names text[] = coalesce(
            array_agg(a.attname order by a.attnum),
            '{}'::text[]
        )
        from
            pg_catalog.pg_attribute a
        where
            a.attrelid = new.entity
            and a.attnum > 0
            and not a.attisdropped
            and pg_catalog.has_column_privilege(
                (new.claims ->> 'role'),
                a.attrelid,
                a.attnum,
                'SELECT'
            );
    filter realtime.user_defined_filter;
    col_type regtype;
    in_val jsonb;
    selected_col text;
begin
    for filter in select * from unnest(new.filters) loop
        if not filter.column_name = any(col_names) then
            raise exception 'invalid column for filter %', filter.column_name;
        end if;

        col_type = (
            select atttypid::regtype
            from pg_catalog.pg_attribute
            where attrelid = new.entity
                  and attname = filter.column_name
        );
        if col_type is null then
            raise exception 'failed to lookup type for column %', filter.column_name;
        end if;

        if filter.op = 'in'::realtime.equality_op then
            in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
            if coalesce(jsonb_array_length(in_val), 0) > 100 then
                raise exception 'too many values for `in` filter. Maximum 100';
            end if;
        elsif filter.op = 'is'::realtime.equality_op then
            -- `is` requires a keyword RHS rather than a typed literal
            if filter.value not in ('null', 'true', 'false', 'unknown') then
                raise exception 'invalid value for is filter: must be null, true, false, or unknown';
            end if;
            -- IS NULL works for any type, but IS TRUE/FALSE/UNKNOWN require a boolean
            -- operand. Reject the non-null keywords on non-boolean columns here so they
            -- don't abort apply_rls at WAL time.
            if filter.value <> 'null' and col_type <> 'boolean'::regtype then
                raise exception 'is % filter requires a boolean column, got %', filter.value, col_type::text;
            end if;
        elsif filter.op in ('like'::realtime.equality_op, 'ilike'::realtime.equality_op) then
            -- like/ilike apply the text pattern operator (~~); reject column types that
            -- have no such operator instead of failing at WAL time
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = '~~' and oprleft = col_type
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
        elsif filter.op in ('match'::realtime.equality_op, 'imatch'::realtime.equality_op) then
            -- match/imatch apply the regex operators ~ / ~*; reject column types that have
            -- no such operator (e.g. integer) instead of failing at WAL time, mirroring the
            -- like/ilike guard above.
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = case when filter.op = 'imatch'::realtime.equality_op then '~*' else '~' end
                  and oprleft = col_type
                  and oprright = col_type
                  and oprresult = 'boolean'::regtype
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
            -- validate the regex eagerly so a bad pattern is rejected here, not inside
            -- apply_rls where it would abort the WAL stream for the entity
            begin
                perform '' ~ filter.value;
            exception when others then
                raise exception 'invalid regular expression for % filter: %', filter.op::text, sqlerrm;
            end;
        else
            -- eq/neq/lt/lte/gt/gte: value must be coercable to the type
            perform realtime.cast(filter.value, col_type);
        end if;
    end loop;

    if new.selected_columns is not null then
        for selected_col in select * from unnest(new.selected_columns) loop
            if not selected_col = any(col_names) then
                raise exception 'invalid column for select %', selected_col;
            end if;
        end loop;
    end if;

    -- Apply consistent order to filters so the unique constraint can't be tricked by a
    -- different filter order. negate is part of the sort key.
    new.filters = coalesce(
        array_agg(f order by f.column_name, f.op, f.value, f.negate),
        '{}'
    ) from unnest(new.filters) f;

    new.selected_columns = (
        select array_agg(c order by c)
        from unnest(new.selected_columns) c
    );

    return new;
end;
$$;


--
-- TOC entry 381 (class 1255 OID 17242)
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- TOC entry 385 (class 1255 OID 17325)
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- TOC entry 388 (class 1255 OID 17367)
-- Name: wal2json_escape_identifier(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.wal2json_escape_identifier(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  -- Prefix `\`, `,`, `.`, and any whitespace with `\`
  SELECT regexp_replace(name, '([\\,.[:space:]])', '\\\1', 'g')
$$;


--
-- TOC entry 407 (class 1255 OID 17584)
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- TOC entry 406 (class 1255 OID 17583)
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- TOC entry 397 (class 1255 OID 17460)
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- TOC entry 400 (class 1255 OID 17516)
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- TOC entry 393 (class 1255 OID 17435)
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- TOC entry 392 (class 1255 OID 17434)
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    RETURN _parts[array_length(_parts, 1)];
END
$$;


--
-- TOC entry 391 (class 1255 OID 17433)
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- TOC entry 401 (class 1255 OID 17572)
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


--
-- TOC entry 394 (class 1255 OID 17447)
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- TOC entry 398 (class 1255 OID 17499)
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- TOC entry 402 (class 1255 OID 17573)
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- TOC entry 399 (class 1255 OID 17515)
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- TOC entry 405 (class 1255 OID 17579)
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- TOC entry 395 (class 1255 OID 17449)
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_prefix_len INT;
    v_prefix_start INT;
    v_combined_levels INT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_prefix_len := length(coalesce(prefix, ''));
    v_prefix_start := coalesce(array_length(string_to_array(coalesce(prefix, ''), v_delimiter), 1), 1);
    v_combined_levels := coalesce(array_length(string_to_array(v_prefix, v_delimiter), 1), 1);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT array_to_string(path_tokens[$1:$2], '/') AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $3 || '%%'
                  AND bucket_id = $4
                  AND array_length(objects.path_tokens, 1) <> $2
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT array_to_string(path_tokens[$1:$2], '/') AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $3 || '%%'
               AND bucket_id = $4
               AND array_length(objects.path_tokens, 1) = $2
             ORDER BY %I %s)
            LIMIT $5 OFFSET $6
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING v_prefix_start, v_combined_levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := substring(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter) from v_prefix_len + 1);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := substring(v_current.name from v_prefix_len + 1);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


--
-- TOC entry 404 (class 1255 OID 17577)
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
    v_sort_order text;
    v_sort_column text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    -- Defense-in-depth: this function is independently reachable and must
    -- not trust p_sort_order/p_sort_column to already be validated by a
    -- caller. Normalize to the same strict allow-list storage.search_v2
    -- uses before interpolating anything into dynamic SQL below.
    v_sort_order := lower(coalesce(p_sort_order, 'asc'));
    IF v_sort_order NOT IN ('asc', 'desc') THEN
        v_sort_order := 'asc';
    END IF;

    v_sort_column := lower(coalesce(p_sort_column, 'updated_at'));
    IF v_sort_column NOT IN ('updated_at', 'created_at') THEN
        v_sort_column := 'updated_at';
    END IF;

    IF v_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        v_sort_column,
        v_cursor_op,
        v_sort_column,
        v_sort_order,
        v_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


--
-- TOC entry 403 (class 1255 OID 17576)
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


--
-- TOC entry 396 (class 1255 OID 17450)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 239 (class 1259 OID 16529)
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- TOC entry 4530 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- TOC entry 258 (class 1259 OID 17084)
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_claims_allowlist text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- TOC entry 252 (class 1259 OID 16889)
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- TOC entry 4531 (class 0 OID 0)
-- Dependencies: 252
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- TOC entry 243 (class 1259 OID 16686)
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- TOC entry 4532 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- TOC entry 4533 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- TOC entry 238 (class 1259 OID 16522)
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- TOC entry 4534 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- TOC entry 247 (class 1259 OID 16776)
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- TOC entry 4535 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- TOC entry 246 (class 1259 OID 16764)
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- TOC entry 4536 (class 0 OID 0)
-- Dependencies: 246
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- TOC entry 245 (class 1259 OID 16751)
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- TOC entry 4537 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- TOC entry 4538 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- TOC entry 255 (class 1259 OID 17001)
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- TOC entry 257 (class 1259 OID 17074)
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- TOC entry 4539 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- TOC entry 254 (class 1259 OID 16971)
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- TOC entry 256 (class 1259 OID 17034)
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- TOC entry 253 (class 1259 OID 16939)
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- TOC entry 237 (class 1259 OID 16511)
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- TOC entry 4540 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- TOC entry 236 (class 1259 OID 16510)
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4541 (class 0 OID 0)
-- Dependencies: 236
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- TOC entry 250 (class 1259 OID 16818)
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- TOC entry 4542 (class 0 OID 0)
-- Dependencies: 250
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- TOC entry 251 (class 1259 OID 16836)
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- TOC entry 4543 (class 0 OID 0)
-- Dependencies: 251
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- TOC entry 240 (class 1259 OID 16537)
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- TOC entry 4544 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- TOC entry 244 (class 1259 OID 16716)
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- TOC entry 4545 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- TOC entry 4546 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- TOC entry 4547 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- TOC entry 4548 (class 0 OID 0)
-- Dependencies: 244
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- TOC entry 249 (class 1259 OID 16803)
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- TOC entry 4549 (class 0 OID 0)
-- Dependencies: 249
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- TOC entry 248 (class 1259 OID 16794)
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- TOC entry 4550 (class 0 OID 0)
-- Dependencies: 248
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- TOC entry 4551 (class 0 OID 0)
-- Dependencies: 248
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- TOC entry 235 (class 1259 OID 16499)
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- TOC entry 4552 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- TOC entry 4553 (class 0 OID 0)
-- Dependencies: 235
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- TOC entry 260 (class 1259 OID 17149)
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- TOC entry 259 (class 1259 OID 17126)
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- TOC entry 287 (class 1259 OID 23779)
-- Name: DietPlan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DietPlan" (
    id text NOT NULL,
    "gymId" text NOT NULL,
    "memberId" text NOT NULL,
    title text NOT NULL,
    "caloriesPerDay" integer NOT NULL,
    "mealPlan" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

ALTER TABLE ONLY public."DietPlan" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 289 (class 1259 OID 27027)
-- Name: Employee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Employee" (
    id text NOT NULL,
    "gymId" text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    "position" text NOT NULL,
    "joiningDate" date NOT NULL,
    salary numeric(12,2),
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

ALTER TABLE ONLY public."Employee" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 292 (class 1259 OID 30531)
-- Name: Exercise; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Exercise" (
    id text NOT NULL,
    "gymId" text NOT NULL,
    name text NOT NULL,
    "muscleGroup" public."MuscleGroup" NOT NULL,
    "defaultSets" integer,
    "defaultReps" text,
    "defaultTempo" text,
    "defaultRestSeconds" integer,
    "isSeeded" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "trackingType" public."ExerciseTrackingType" DEFAULT 'WEIGHTED'::public."ExerciseTrackingType" NOT NULL
);

ALTER TABLE ONLY public."Exercise" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 285 (class 1259 OID 19525)
-- Name: Gym; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Gym" (
    id text NOT NULL,
    name text NOT NULL,
    slug text,
    "memberSeq" integer DEFAULT 0 NOT NULL,
    "receiptSeq" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "registrationToken" text NOT NULL
);

ALTER TABLE ONLY public."Gym" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 290 (class 1259 OID 29725)
-- Name: GymEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GymEvent" (
    id text NOT NULL,
    "gymId" text NOT NULL,
    title text NOT NULL,
    "eventDate" date NOT NULL,
    location text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

ALTER TABLE ONLY public."GymEvent" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 282 (class 1259 OID 18147)
-- Name: GymProfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."GymProfile" (
    id text NOT NULL,
    name text DEFAULT 'My Gym'::text NOT NULL,
    "logoUrl" text,
    address text,
    phone text,
    "ownerNotifyPhone" text,
    "ownerNotifyEmail" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "gymId" text NOT NULL,
    "membershipPolicyText" text
);

ALTER TABLE ONLY public."GymProfile" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 291 (class 1259 OID 30449)
-- Name: LedgerTransaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."LedgerTransaction" (
    id text NOT NULL,
    "gymId" text NOT NULL,
    type public."LedgerTransactionType" NOT NULL,
    category text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "occurredOn" date NOT NULL,
    note text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

ALTER TABLE ONLY public."LedgerTransaction" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 279 (class 1259 OID 17658)
-- Name: Member; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Member" (
    id text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    email text,
    "gymId" text NOT NULL,
    "memberNumber" integer NOT NULL,
    "photoUrl" text,
    gender public."MemberGender" DEFAULT 'PREFER_NOT_TO_SAY'::public."MemberGender" NOT NULL,
    "isPt" boolean DEFAULT false NOT NULL,
    "trainerId" text,
    "membershipPolicyAgreedText" text,
    "membershipPolicyAgreedAt" timestamp(3) without time zone,
    "portalEnabledAt" timestamp(3) without time zone,
    "ageYears" integer,
    "heightCm" integer,
    "weightKg" numeric(5,1),
    "fitnessGoal" public."FitnessGoal"
);

ALTER TABLE ONLY public."Member" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 278 (class 1259 OID 17648)
-- Name: Package; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Package" (
    id text NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    "durationValue" integer NOT NULL,
    "durationUnit" public."DurationUnit" DEFAULT 'MONTHS'::public."DurationUnit" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "gymId" text NOT NULL
);

ALTER TABLE ONLY public."Package" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 281 (class 1259 OID 17674)
-- Name: Payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "memberId" text NOT NULL,
    "subscriptionId" text,
    amount numeric(10,2) NOT NULL,
    method public."PaymentMethod" DEFAULT 'CASH'::public."PaymentMethod" NOT NULL,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    note text,
    "recordedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "gymId" text NOT NULL
);

ALTER TABLE ONLY public."Payment" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 284 (class 1259 OID 18157)
-- Name: Receipt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Receipt" (
    id text NOT NULL,
    number integer NOT NULL,
    "paymentId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "gymName" text NOT NULL,
    "gymAddress" text,
    "gymPhone" text,
    "gymLogoUrl" text,
    "memberId" text NOT NULL,
    "memberName" text NOT NULL,
    "memberPhone" text NOT NULL,
    "memberEmail" text,
    "packageName" text,
    amount numeric(10,2) NOT NULL,
    method public."PaymentMethod" NOT NULL,
    "paidAt" timestamp(3) without time zone NOT NULL,
    "periodStart" timestamp(3) without time zone,
    "periodEnd" timestamp(3) without time zone,
    "gymId" text NOT NULL,
    "amountOwed" numeric(10,2),
    "balanceAfter" numeric(10,2)
);

ALTER TABLE ONLY public."Receipt" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 283 (class 1259 OID 18156)
-- Name: Receipt_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Receipt_number_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4554 (class 0 OID 0)
-- Dependencies: 283
-- Name: Receipt_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Receipt_number_seq" OWNED BY public."Receipt".number;


--
-- TOC entry 297 (class 1259 OID 30658)
-- Name: StaffLoginThrottle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StaffLoginThrottle" (
    key text NOT NULL,
    "failCount" integer DEFAULT 0 NOT NULL,
    "windowEndsAt" timestamp(3) without time zone NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

ALTER TABLE ONLY public."StaffLoginThrottle" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 280 (class 1259 OID 17666)
-- Name: Subscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Subscription" (
    id text NOT NULL,
    "memberId" text NOT NULL,
    "packageId" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "priceAtPurchase" numeric(10,2) NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "gymId" text NOT NULL,
    "writtenOffAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "writtenOffAt" timestamp(3) without time zone,
    "writtenOffById" text
);

ALTER TABLE ONLY public."Subscription" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 277 (class 1259 OID 17639)
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."Role" DEFAULT 'STAFF'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "gymId" text
);

ALTER TABLE ONLY public."User" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 286 (class 1259 OID 19722)
-- Name: Visitor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Visitor" (
    id text NOT NULL,
    "gymId" text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    "visitDate" date NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status public."VisitorStatus" DEFAULT 'pending'::public."VisitorStatus" NOT NULL,
    email text,
    gender public."MemberGender",
    source public."VisitorSource" DEFAULT 'walk_in'::public."VisitorSource" NOT NULL,
    "membershipPolicyAgreedText" text,
    "membershipPolicyAgreedAt" timestamp(3) without time zone,
    "fitnessGoal" public."FitnessGoal",
    "ageYears" integer,
    "heightCm" integer,
    "weightKg" numeric(5,1)
);

ALTER TABLE ONLY public."Visitor" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 288 (class 1259 OID 23787)
-- Name: WorkoutPlan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkoutPlan" (
    id text NOT NULL,
    "gymId" text NOT NULL,
    "memberId" text NOT NULL,
    title text NOT NULL,
    level public."WorkoutLevel",
    "weeklySchedule" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "durationWeeks" integer,
    "focusGoal" text
);

ALTER TABLE ONLY public."WorkoutPlan" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 298 (class 1259 OID 30692)
-- Name: WorkoutPlanDay; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkoutPlanDay" (
    id text NOT NULL,
    "gymId" text NOT NULL,
    "workoutPlanId" text NOT NULL,
    label text NOT NULL,
    "sortOrder" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

ALTER TABLE ONLY public."WorkoutPlanDay" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 293 (class 1259 OID 30547)
-- Name: WorkoutPlanExercise; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkoutPlanExercise" (
    id text NOT NULL,
    "gymId" text NOT NULL,
    "workoutPlanId" text NOT NULL,
    "exerciseId" text,
    "customName" text,
    "sortOrder" integer NOT NULL,
    "targetSets" integer NOT NULL,
    "targetReps" text NOT NULL,
    tempo text,
    "restSeconds" integer,
    "targetWeightKg" numeric(6,2),
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "trackingTypeOverride" public."ExerciseTrackingType",
    "workoutPlanDayId" text NOT NULL
);

ALTER TABLE ONLY public."WorkoutPlanExercise" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 294 (class 1259 OID 30577)
-- Name: WorkoutSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkoutSession" (
    id text NOT NULL,
    "gymId" text NOT NULL,
    "memberId" text NOT NULL,
    "workoutPlanId" text NOT NULL,
    status public."WorkoutSessionStatus" DEFAULT 'IN_PROGRESS'::public."WorkoutSessionStatus" NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "durationSeconds" integer,
    "workoutPlanDayId" text
);

ALTER TABLE ONLY public."WorkoutSession" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 295 (class 1259 OID 30593)
-- Name: WorkoutSessionExercise; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkoutSessionExercise" (
    id text NOT NULL,
    "gymId" text NOT NULL,
    "workoutSessionId" text NOT NULL,
    "workoutPlanExerciseId" text NOT NULL,
    "sortOrder" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

ALTER TABLE ONLY public."WorkoutSessionExercise" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 296 (class 1259 OID 30614)
-- Name: WorkoutSetLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WorkoutSetLog" (
    id text NOT NULL,
    "gymId" text NOT NULL,
    "sessionExerciseId" text NOT NULL,
    "setNumber" integer NOT NULL,
    "weightKg" numeric(6,2),
    "loggedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "durationSeconds" integer
);

ALTER TABLE ONLY public."WorkoutSetLog" FORCE ROW LEVEL SECURITY;


--
-- TOC entry 276 (class 1259 OID 17605)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 267 (class 1259 OID 17335)
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    skip_broadcast boolean DEFAULT false NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- TOC entry 261 (class 1259 OID 17173)
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- TOC entry 264 (class 1259 OID 17195)
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    selected_columns text[],
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- TOC entry 263 (class 1259 OID 17194)
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 269 (class 1259 OID 17405)
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL,
    versioning_status text DEFAULT 'DISABLED'::text NOT NULL,
    CONSTRAINT buckets_versioning_dark_check CHECK ((versioning_status = 'DISABLED'::text)),
    CONSTRAINT buckets_versioning_standard_only_check CHECK (((type = 'STANDARD'::storage.buckettype) OR (versioning_status = 'DISABLED'::text))),
    CONSTRAINT buckets_versioning_status_check CHECK ((versioning_status = ANY (ARRAY['DISABLED'::text, 'ENABLED'::text, 'SUSPENDED'::text])))
);


--
-- TOC entry 4555 (class 0 OID 0)
-- Dependencies: 269
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- TOC entry 273 (class 1259 OID 17524)
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- TOC entry 274 (class 1259 OID 17537)
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 268 (class 1259 OID 17397)
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 270 (class 1259 OID 17415)
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    archived_at timestamp with time zone,
    is_delete_marker boolean DEFAULT false NOT NULL,
    is_versioned boolean DEFAULT false NOT NULL
);


--
-- TOC entry 4556 (class 0 OID 0)
-- Dependencies: 270
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- TOC entry 271 (class 1259 OID 17464)
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


--
-- TOC entry 272 (class 1259 OID 17478)
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 275 (class 1259 OID 17547)
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 3732 (class 2604 OID 16514)
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- TOC entry 4460 (class 0 OID 16529)
-- Dependencies: 239
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- TOC entry 4477 (class 0 OID 17084)
-- Dependencies: 258
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.custom_oauth_providers (id, provider_type, identifier, name, client_id, client_secret, acceptable_client_ids, scopes, pkce_enabled, attribute_mapping, authorization_params, enabled, email_optional, issuer, discovery_url, skip_nonce_check, cached_discovery, discovery_cached_at, authorization_url, token_url, userinfo_url, jwks_uri, created_at, updated_at, custom_claims_allowlist) FROM stdin;
\.


--
-- TOC entry 4471 (class 0 OID 16889)
-- Dependencies: 252
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at, invite_token, referrer, oauth_client_state_id, linking_target_id, email_optional) FROM stdin;
\.


--
-- TOC entry 4462 (class 0 OID 16686)
-- Dependencies: 243
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
\.


--
-- TOC entry 4459 (class 0 OID 16522)
-- Dependencies: 238
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4466 (class 0 OID 16776)
-- Dependencies: 247
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- TOC entry 4465 (class 0 OID 16764)
-- Dependencies: 246
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- TOC entry 4464 (class 0 OID 16751)
-- Dependencies: 245
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- TOC entry 4474 (class 0 OID 17001)
-- Dependencies: 255
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- TOC entry 4476 (class 0 OID 17074)
-- Dependencies: 257
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- TOC entry 4473 (class 0 OID 16971)
-- Dependencies: 254
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type, token_endpoint_auth_method) FROM stdin;
\.


--
-- TOC entry 4475 (class 0 OID 17034)
-- Dependencies: 256
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- TOC entry 4472 (class 0 OID 16939)
-- Dependencies: 253
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4458 (class 0 OID 16511)
-- Dependencies: 237
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- TOC entry 4469 (class 0 OID 16818)
-- Dependencies: 250
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- TOC entry 4470 (class 0 OID 16836)
-- Dependencies: 251
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- TOC entry 4461 (class 0 OID 16537)
-- Dependencies: 240
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
20260115000000
20260121000000
20260219120000
20260302000000
20260625000000
\.


--
-- TOC entry 4463 (class 0 OID 16716)
-- Dependencies: 244
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
\.


--
-- TOC entry 4468 (class 0 OID 16803)
-- Dependencies: 249
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4467 (class 0 OID 16794)
-- Dependencies: 248
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- TOC entry 4456 (class 0 OID 16499)
-- Dependencies: 235
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
\.


--
-- TOC entry 4479 (class 0 OID 17149)
-- Dependencies: 260
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_challenges (id, user_id, challenge_type, session_data, created_at, expires_at) FROM stdin;
\.


--
-- TOC entry 4478 (class 0 OID 17126)
-- Dependencies: 259
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, transports, backup_eligible, backed_up, friendly_name, created_at, updated_at, last_used_at) FROM stdin;
\.


--
-- TOC entry 4502 (class 0 OID 23779)
-- Dependencies: 287
-- Data for Name: DietPlan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DietPlan" (id, "gymId", "memberId", title, "caloriesPerDay", "mealPlan", "createdAt", "updatedAt") FROM stdin;
cms5mwraa000avfpxsnvs2e35	gym_default_0000000001	cmrwwosr7003jxxl4ux5orodc	bulk	2400	breakfast: \r\nlunch:\r\ndinner:	2026-07-29 05:18:46.092	2026-07-29 05:18:46.092
cmsb6t4op00113ebu6oryj5ui	gym_default_0000000001	cmrwrklu40022w9q01xu0hyzp	bulking	2500	BREAKFAST\r\nEgg: 1\r\nEgg White: 6\r\nWhole Wheat Bread: 3 Slices\r\nPeanut Butter: 1 tbsp\r\nOrange Juice: 300 ml\r\n\r\nSNACK\r\nProtein Shake\r\n\r\nLUNCH\r\nChicken: 240 gm.\r\nBarbeque Sauce 1 tbsp.\r\nBaked Potato: 1\r\nBanana: 1\r\nAlmonds: 22\r\n\r\nDINNER\r\nBeef Minced: 240 gm.\r\nWhite Rice: 2 cups\r\nSalad\r\nBalsamic Vinaigrette: 2 tbsp.	2026-08-02 02:34:40.017	2026-08-09 19:14:51.515
\.


--
-- TOC entry 4504 (class 0 OID 27027)
-- Dependencies: 289
-- Data for Name: Employee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Employee" (id, "gymId", name, phone, "position", "joiningDate", salary, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 4507 (class 0 OID 30531)
-- Dependencies: 292
-- Data for Name: Exercise; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Exercise" (id, "gymId", name, "muscleGroup", "defaultSets", "defaultReps", "defaultTempo", "defaultRestSeconds", "isSeeded", "createdAt", "updatedAt", "trackingType") FROM stdin;
540c25bc-2393-4818-a110-04ee18961c56	cmrgigyeg00016738y7zlessn	Bench Press	CHEST	4	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
26159aa0-3562-44c5-ae91-ee84f700caf8	gym_default_0000000001	Bench Press	CHEST	4	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
a879c886-a975-480a-be1e-ff4bffd40d28	cmrvc15vc0021iyq9nl17a2os	Bench Press	CHEST	4	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
4beecea8-946e-46ed-9f3d-c028339280af	cmrvd8wgq000zg8ob0bkkpzjq	Bench Press	CHEST	4	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
c346b516-0ca7-4df0-aa30-bae572c8d6a2	cmrw6a0sl000gkbqusagk51w3	Bench Press	CHEST	4	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
9c6bf4f0-30ed-4e24-972a-419c5db59213	cmrw7q3ce002fkbquny9zw333	Bench Press	CHEST	4	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
9512333f-73c1-4c42-9da7-40e0380d2237	cmrgigyeg00016738y7zlessn	Incline DB Press	CHEST	3	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
1feaeab5-ee69-4b4e-89d8-8c05991a4458	gym_default_0000000001	Incline DB Press	CHEST	3	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
9b7d5366-162a-42eb-b720-04c5d11dca0a	cmrvc15vc0021iyq9nl17a2os	Incline DB Press	CHEST	3	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
ec04a55f-b692-4956-891c-cae4785bb360	cmrvd8wgq000zg8ob0bkkpzjq	Incline DB Press	CHEST	3	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
8b5e0bbd-a7ee-4d4a-b9f1-b4096efc584f	cmrw6a0sl000gkbqusagk51w3	Incline DB Press	CHEST	3	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
34fefae8-4d34-45fe-9d54-ff65d531188f	cmrw7q3ce002fkbquny9zw333	Incline DB Press	CHEST	3	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
e1dd80de-a13c-4df8-9eb3-1bbf0fc9aaff	cmrgigyeg00016738y7zlessn	Push Ups	CHEST	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
9c0aa064-5c05-41ea-b57a-c112f371479f	gym_default_0000000001	Push Ups	CHEST	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
07f6748e-de95-4310-aae0-8f186806669c	cmrvc15vc0021iyq9nl17a2os	Push Ups	CHEST	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
338aa375-48d3-42c6-b4f9-6a56fe070a2e	cmrvd8wgq000zg8ob0bkkpzjq	Push Ups	CHEST	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
6eee8bab-72f5-40d7-b738-cbc2b1f5403d	cmrw6a0sl000gkbqusagk51w3	Push Ups	CHEST	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
9a0c3169-8d65-431d-bd05-d97661d4fabe	cmrw7q3ce002fkbquny9zw333	Push Ups	CHEST	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
4d0a8781-c289-43b1-b2f5-5a9a75109132	cmrgigyeg00016738y7zlessn	Cable Fly	CHEST	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
d342662a-cba4-4fd8-8a14-23380691b9c1	gym_default_0000000001	Cable Fly	CHEST	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
970afb44-6332-4342-bfef-bbcec3cf0853	cmrvc15vc0021iyq9nl17a2os	Cable Fly	CHEST	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
ab17a20e-2ddb-40c8-83c0-c749289ac374	cmrvd8wgq000zg8ob0bkkpzjq	Cable Fly	CHEST	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
748ab815-6dd6-44c2-aad8-1c4f8ba9ac1e	cmrw6a0sl000gkbqusagk51w3	Cable Fly	CHEST	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
6e4016c0-0206-4c75-abd2-d1e266ab071e	cmrw7q3ce002fkbquny9zw333	Cable Fly	CHEST	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
39ba4ca0-7ae8-4a9c-9754-50a5d5192b47	cmrgigyeg00016738y7zlessn	Dips	CHEST	3	8-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
2d9bceb3-4a7c-40d3-abb9-6d8e7f1d9cf9	gym_default_0000000001	Dips	CHEST	3	8-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
fca279bd-8f99-4ef6-8638-03108b7ca4ef	cmrvc15vc0021iyq9nl17a2os	Dips	CHEST	3	8-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
256d49a0-e9e7-4960-a966-de2f148817e0	cmrvd8wgq000zg8ob0bkkpzjq	Dips	CHEST	3	8-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
b130cf7c-9255-4462-8ba7-c14f77e29f74	cmrw6a0sl000gkbqusagk51w3	Dips	CHEST	3	8-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
9e326f2e-9da9-47bd-9e08-df3eae1b10f6	cmrw7q3ce002fkbquny9zw333	Dips	CHEST	3	8-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
d404bece-914e-41ac-9891-14124d2580d8	cmrgigyeg00016738y7zlessn	Lat Pulldown	BACK	4	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
486ae919-95f6-43e1-9429-8f86cf7d330e	gym_default_0000000001	Lat Pulldown	BACK	4	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
c97ce0c3-4b1e-4528-a83e-54af4a5d2f00	cmrvc15vc0021iyq9nl17a2os	Lat Pulldown	BACK	4	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
7e16014b-ef46-4bf5-a279-2fb0ec4fe6dd	cmrvd8wgq000zg8ob0bkkpzjq	Lat Pulldown	BACK	4	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
8a17569e-3e34-4a56-af4f-ecdcf8e4726a	cmrw6a0sl000gkbqusagk51w3	Lat Pulldown	BACK	4	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
ec788160-3b9e-4466-af34-c831ce8ebd18	cmrw7q3ce002fkbquny9zw333	Lat Pulldown	BACK	4	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
7ee152b5-02cb-4559-afb2-48d770c755ea	cmrgigyeg00016738y7zlessn	Barbell Row	BACK	4	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
33c51345-6d4d-4a7b-b816-619553c46522	gym_default_0000000001	Barbell Row	BACK	4	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
30b57bec-7412-4f2e-a789-f82a446c4bc5	cmrvc15vc0021iyq9nl17a2os	Barbell Row	BACK	4	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
6d1c5798-4b2f-4acf-b49c-2e8c54eb0d9c	cmrvd8wgq000zg8ob0bkkpzjq	Barbell Row	BACK	4	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
7253c1f6-6e6e-41e5-9274-d42b58cc1df5	cmrw6a0sl000gkbqusagk51w3	Barbell Row	BACK	4	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
f410149c-8f4b-423a-b845-359f84739584	cmrw7q3ce002fkbquny9zw333	Barbell Row	BACK	4	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
f03f6dce-f645-406b-947d-2f7ba0e5d7a6	cmrgigyeg00016738y7zlessn	Seated Cable Row	BACK	3	10-12	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
47f3b96e-6e8a-49b2-a41f-d443a1b65a29	gym_default_0000000001	Seated Cable Row	BACK	3	10-12	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
18667f4c-0c03-444e-804b-f77266d5a2fa	cmrvc15vc0021iyq9nl17a2os	Seated Cable Row	BACK	3	10-12	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
92c3f34a-71f0-4405-8f9d-dc8a9c6bd124	cmrvd8wgq000zg8ob0bkkpzjq	Seated Cable Row	BACK	3	10-12	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
7928c74c-cd37-4f28-ab51-ec1f77cbc8ab	cmrw6a0sl000gkbqusagk51w3	Seated Cable Row	BACK	3	10-12	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
cab12673-01bf-4df7-8e73-24ab20fed52c	cmrw7q3ce002fkbquny9zw333	Seated Cable Row	BACK	3	10-12	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
c7e40b36-5789-43ce-8e6a-c6b35cb50ff0	cmrgigyeg00016738y7zlessn	Pull Ups	BACK	3	6-10	\N	120	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
d6e7f1fa-1c6b-42be-a468-61713309c18f	gym_default_0000000001	Pull Ups	BACK	3	6-10	\N	120	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
5aa6d806-5637-4871-89a0-e69c8d1e089d	cmrvc15vc0021iyq9nl17a2os	Pull Ups	BACK	3	6-10	\N	120	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
1ad2e41c-cd0d-4c30-8713-8e5e5773a54d	cmrvd8wgq000zg8ob0bkkpzjq	Pull Ups	BACK	3	6-10	\N	120	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
441d484b-e41b-4ede-87d4-43c83feca67c	cmrw6a0sl000gkbqusagk51w3	Pull Ups	BACK	3	6-10	\N	120	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
6c5e9b5d-ad1d-4ceb-af6f-d14c0dd1698e	cmrw7q3ce002fkbquny9zw333	Pull Ups	BACK	3	6-10	\N	120	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
3fe46def-21c2-4baf-83f5-1cd53d818d25	cmrgigyeg00016738y7zlessn	Deadlift	BACK	4	5-6	\N	180	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
7c4ab1ea-5b52-4fe6-a77e-64d32cb4b3ed	gym_default_0000000001	Deadlift	BACK	4	5-6	\N	180	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
77afc71a-296d-458e-86a0-8bb72be779c6	cmrvc15vc0021iyq9nl17a2os	Deadlift	BACK	4	5-6	\N	180	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
f55ef42f-2de2-4161-8126-ec49d87489e3	cmrvd8wgq000zg8ob0bkkpzjq	Deadlift	BACK	4	5-6	\N	180	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
d76a633d-d06a-4977-b97e-bb15b6f9ae52	cmrw6a0sl000gkbqusagk51w3	Deadlift	BACK	4	5-6	\N	180	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
baec1ba4-ffdc-4f46-94fa-80b47bd52fa2	cmrw7q3ce002fkbquny9zw333	Deadlift	BACK	4	5-6	\N	180	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
29d8622d-b1ec-44fe-a1c8-f3985b262d81	cmrgigyeg00016738y7zlessn	Squat	LEGS	4	6-8	\N	120	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
d389f866-a9fe-43ab-bd45-e3b89d5e4959	gym_default_0000000001	Squat	LEGS	4	6-8	\N	120	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
3b1c62a5-bbd0-4805-953b-77713938c7bf	cmrvc15vc0021iyq9nl17a2os	Squat	LEGS	4	6-8	\N	120	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
0d9618e8-e8fb-4cc3-8794-c5132361bd63	cmrvd8wgq000zg8ob0bkkpzjq	Squat	LEGS	4	6-8	\N	120	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
01716484-582a-4fd3-a051-22658fd64fad	cmrw6a0sl000gkbqusagk51w3	Squat	LEGS	4	6-8	\N	120	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
3ae9a620-39a6-4e66-82dc-0a78647c1df1	cmrw7q3ce002fkbquny9zw333	Squat	LEGS	4	6-8	\N	120	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
7183eeb2-cea4-4046-86c6-f43846f313d7	cmrgigyeg00016738y7zlessn	Leg Press	LEGS	4	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
6b50abd9-b175-4b00-9184-55233efe6bea	gym_default_0000000001	Leg Press	LEGS	4	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
b25df022-cae7-466e-a0eb-07b7db6f1813	cmrvc15vc0021iyq9nl17a2os	Leg Press	LEGS	4	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
86229d08-02d1-4f99-bff2-52974dc68b60	cmrvd8wgq000zg8ob0bkkpzjq	Leg Press	LEGS	4	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
e28c76ef-67ac-4743-a4b3-f87a6cb2323d	cmrw6a0sl000gkbqusagk51w3	Leg Press	LEGS	4	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
d5833955-efa3-47c5-9c73-537122044f44	cmrw7q3ce002fkbquny9zw333	Leg Press	LEGS	4	10-12	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
2ff30757-a75f-446a-89ec-91f4796bb1ce	cmrgigyeg00016738y7zlessn	Lunges	LEGS	3	10 each	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
e08fd53e-5c7d-4b90-9628-f606f333e840	gym_default_0000000001	Lunges	LEGS	3	10 each	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
3a68ac73-e37f-4c73-ab53-af760573425a	cmrvc15vc0021iyq9nl17a2os	Lunges	LEGS	3	10 each	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
d0d6d2ca-6056-40c9-ba4e-d1c75810680b	cmrvd8wgq000zg8ob0bkkpzjq	Lunges	LEGS	3	10 each	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
bf816faa-9644-404b-b4b6-7964df719ccc	cmrw6a0sl000gkbqusagk51w3	Lunges	LEGS	3	10 each	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
987d5e1d-fbca-414e-b607-b7b45b9870d5	cmrw7q3ce002fkbquny9zw333	Lunges	LEGS	3	10 each	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
cff13ae5-7451-42b8-8fbe-6f286c664581	cmrgigyeg00016738y7zlessn	Romanian Deadlift	LEGS	3	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
5234b32d-2562-44be-b99e-4cb1bf1ee969	gym_default_0000000001	Romanian Deadlift	LEGS	3	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
a56c9a17-e432-4e20-bf03-76c5cbd5182f	cmrvc15vc0021iyq9nl17a2os	Romanian Deadlift	LEGS	3	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
def245a2-3e39-4ed6-a3e0-5835a425632b	cmrvd8wgq000zg8ob0bkkpzjq	Romanian Deadlift	LEGS	3	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
9dad32d5-ac1f-4450-9cae-662699006712	cmrw6a0sl000gkbqusagk51w3	Romanian Deadlift	LEGS	3	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
5cdfb749-4b68-4f88-9f6b-4249ac315ba4	cmrw7q3ce002fkbquny9zw333	Romanian Deadlift	LEGS	3	8-10	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
22631658-d5d8-482b-adca-d06348b4cd0b	cmrgigyeg00016738y7zlessn	Leg Curl	LEGS	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
cd9df559-2ef0-49c7-aa16-551ecb914b75	gym_default_0000000001	Leg Curl	LEGS	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
fc46d476-c50b-4088-b2b7-e6c9b159a10e	cmrvc15vc0021iyq9nl17a2os	Leg Curl	LEGS	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
219cda55-47c5-4349-9a47-a511616bfe20	cmrvd8wgq000zg8ob0bkkpzjq	Leg Curl	LEGS	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
fd4af4d4-ddf5-42a8-933d-8a77ad0cb1a6	cmrw6a0sl000gkbqusagk51w3	Leg Curl	LEGS	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
67c62f9c-5aaa-4969-932b-368886af71d5	cmrw7q3ce002fkbquny9zw333	Leg Curl	LEGS	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
94a813ee-8f4a-4d10-b8c2-fcc52ed96437	cmrgigyeg00016738y7zlessn	Calf Raise	LEGS	4	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
8976bc40-d6d6-410b-9e74-21e87cd2b6cc	gym_default_0000000001	Calf Raise	LEGS	4	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
ea8d3e07-984b-4c60-947c-d81bb5fe6b8f	cmrvc15vc0021iyq9nl17a2os	Calf Raise	LEGS	4	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
40295c84-485f-4d40-bbd8-e6edfa43c9d5	cmrvd8wgq000zg8ob0bkkpzjq	Calf Raise	LEGS	4	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
3bf9a73c-ab38-4c61-9d43-4bb33e741c2b	cmrw6a0sl000gkbqusagk51w3	Calf Raise	LEGS	4	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
fa73dab5-3608-4989-93d1-105591310076	cmrw7q3ce002fkbquny9zw333	Calf Raise	LEGS	4	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
dfb47bd7-9ea9-4491-86bf-bd0e5531a89a	cmrgigyeg00016738y7zlessn	Overhead Press	SHOULDERS	4	6-8	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
5bcb0da4-d5d2-4dd4-bf01-9cf35e8eae74	gym_default_0000000001	Overhead Press	SHOULDERS	4	6-8	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
8bd5d561-3f46-4f22-b57f-ca635a822316	cmrvc15vc0021iyq9nl17a2os	Overhead Press	SHOULDERS	4	6-8	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
dcd6beb3-e5e1-41bf-ba2b-e3fcbd37e114	cmrvd8wgq000zg8ob0bkkpzjq	Overhead Press	SHOULDERS	4	6-8	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
2deaef43-d206-4be8-9014-7bf52748aa8c	cmrw6a0sl000gkbqusagk51w3	Overhead Press	SHOULDERS	4	6-8	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
9fbf0b31-205d-4dfb-89c1-7057ea61b89d	cmrw7q3ce002fkbquny9zw333	Overhead Press	SHOULDERS	4	6-8	\N	90	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
b49bb559-da2a-4d13-a9bf-1df940f806aa	cmrgigyeg00016738y7zlessn	DB Shoulder Press	SHOULDERS	3	10-12	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
c3f3969e-897d-4b4a-9809-6bd9ead4fae3	gym_default_0000000001	DB Shoulder Press	SHOULDERS	3	10-12	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
60d7873b-dac5-40ba-a496-eac17e6dda88	cmrvc15vc0021iyq9nl17a2os	DB Shoulder Press	SHOULDERS	3	10-12	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
37c09939-597c-4694-b1d3-e89c56015195	cmrvd8wgq000zg8ob0bkkpzjq	DB Shoulder Press	SHOULDERS	3	10-12	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
ef0675de-d133-48ae-b91f-1ad4a762c75a	cmrw6a0sl000gkbqusagk51w3	DB Shoulder Press	SHOULDERS	3	10-12	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
b418026d-df2a-4e14-935f-331e89a1e38c	cmrw7q3ce002fkbquny9zw333	DB Shoulder Press	SHOULDERS	3	10-12	\N	75	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
c4bda820-e6e6-4a74-a80e-97652901140a	cmrgigyeg00016738y7zlessn	Lateral Raises	SHOULDERS	3	12-15	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
8ff7c1ec-c609-4d17-a406-b66c7a29f48f	gym_default_0000000001	Lateral Raises	SHOULDERS	3	12-15	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
84bf99b8-09be-40d5-95e1-ac74f372fddb	cmrvc15vc0021iyq9nl17a2os	Lateral Raises	SHOULDERS	3	12-15	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
9f2f1388-e499-4fb2-88eb-82f206c2ff55	cmrvd8wgq000zg8ob0bkkpzjq	Lateral Raises	SHOULDERS	3	12-15	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
4de7e44b-3ae8-453c-9cf0-29ce7036b4b7	cmrw6a0sl000gkbqusagk51w3	Lateral Raises	SHOULDERS	3	12-15	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
83d2bfc3-d3ed-40ff-909e-596c27a4cd5a	cmrw7q3ce002fkbquny9zw333	Lateral Raises	SHOULDERS	3	12-15	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
118560b8-504a-4ef5-a802-4d37cd535c2d	cmrgigyeg00016738y7zlessn	Face Pulls	SHOULDERS	3	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
949cf1cb-cd5e-404b-8293-b77e007dad1d	gym_default_0000000001	Face Pulls	SHOULDERS	3	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
a5a7c98e-f1bf-437a-b804-b0a5920228ee	cmrvc15vc0021iyq9nl17a2os	Face Pulls	SHOULDERS	3	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
2664fc88-8af3-45db-b288-2d51204e8ca2	cmrvd8wgq000zg8ob0bkkpzjq	Face Pulls	SHOULDERS	3	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
5c1ad274-654a-4e06-a101-d0513ebe767c	cmrw6a0sl000gkbqusagk51w3	Face Pulls	SHOULDERS	3	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
34dc701f-ae6e-4a98-89cf-54ea5c0f9519	cmrw7q3ce002fkbquny9zw333	Face Pulls	SHOULDERS	3	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
ef2002ea-d647-41ea-b45f-376917090fad	cmrgigyeg00016738y7zlessn	Barbell Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
802d9205-9775-48af-a4d9-37f91110cf99	gym_default_0000000001	Barbell Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
04dc9907-7e03-451d-ac5c-1da909171426	cmrvc15vc0021iyq9nl17a2os	Barbell Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
16afc748-5028-49e1-8d95-84f33a650565	cmrvd8wgq000zg8ob0bkkpzjq	Barbell Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
ec34cf0e-b1d3-4f52-be48-5450598d7a39	cmrw6a0sl000gkbqusagk51w3	Barbell Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
dd3a25bf-9713-4c74-9681-6be22de29637	cmrw7q3ce002fkbquny9zw333	Barbell Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
1d07920d-136f-4f5b-8a4d-f3122dbbcc15	cmrgigyeg00016738y7zlessn	DB Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
ca115276-ac19-4b8f-be28-3b6d06a1fe3e	gym_default_0000000001	DB Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
d18f8d94-563f-424c-9f1a-2dec94340d55	cmrvc15vc0021iyq9nl17a2os	DB Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
257addd0-bc9c-4a4e-b9dc-076cde4fd1a8	cmrvd8wgq000zg8ob0bkkpzjq	DB Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
784cab60-10fe-4cba-a1f6-0b47c3723f2a	cmrw6a0sl000gkbqusagk51w3	DB Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
1f336258-d679-4dd4-9afc-62354f10470b	cmrw7q3ce002fkbquny9zw333	DB Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
5314fb9a-6ffb-4916-8b96-dd4c4b5494b5	cmrgigyeg00016738y7zlessn	Hammer Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
22a251e3-71c8-4fd1-a910-68bb039f8c5d	gym_default_0000000001	Hammer Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
246c92fb-26d2-4e62-81b1-66f6055d8f48	cmrvc15vc0021iyq9nl17a2os	Hammer Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
6dfd45d6-d791-481d-8a22-daf169f677ca	cmrvd8wgq000zg8ob0bkkpzjq	Hammer Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
4db0ef51-cce7-425c-8f48-60dafcfded44	cmrw6a0sl000gkbqusagk51w3	Hammer Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
0cd6d12b-0bee-4d82-bf41-95fdf0ca390f	cmrw7q3ce002fkbquny9zw333	Hammer Curl	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
886a5119-1a38-4292-b032-2aa293cd06c7	cmrgigyeg00016738y7zlessn	Tricep Pushdown	ARMS	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
0d7a6b84-b6f8-4b56-a96a-197d6bffad4e	gym_default_0000000001	Tricep Pushdown	ARMS	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
750e44e5-fcd8-4502-a93b-2cf35442e29a	cmrvc15vc0021iyq9nl17a2os	Tricep Pushdown	ARMS	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
f8bddb20-b2f0-4476-9f67-8c869478026b	cmrvd8wgq000zg8ob0bkkpzjq	Tricep Pushdown	ARMS	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
56329dbd-3716-4a0b-a011-e0baf3a9a8f8	cmrw6a0sl000gkbqusagk51w3	Tricep Pushdown	ARMS	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
b1437c50-3090-4ef2-b75a-e0ff9021d36b	cmrw7q3ce002fkbquny9zw333	Tricep Pushdown	ARMS	3	12-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
d872eb8f-be18-4b4c-977c-c67df398548a	cmrgigyeg00016738y7zlessn	Skull Crushers	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
b6c43e2c-96e2-445f-956b-809a1e295698	gym_default_0000000001	Skull Crushers	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
0d00e70c-9412-4776-a991-3b01813b6a36	cmrvc15vc0021iyq9nl17a2os	Skull Crushers	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
b953f923-30c0-4463-b32d-a86fbe578ee7	cmrvd8wgq000zg8ob0bkkpzjq	Skull Crushers	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
f59d8bcf-6ad0-4fc0-93d0-fcb8f584abef	cmrw6a0sl000gkbqusagk51w3	Skull Crushers	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
9b73ed4d-10ff-425c-9e7c-32dabce88dd4	cmrw7q3ce002fkbquny9zw333	Skull Crushers	ARMS	3	10-12	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
b05d5f34-e7f2-40b6-bb32-461a381a1f3e	cmrgigyeg00016738y7zlessn	Hanging Leg Raise	CORE	3	10-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
bb21206a-b73d-4f57-894d-808b2f32054f	gym_default_0000000001	Hanging Leg Raise	CORE	3	10-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
7b848ea3-0849-48a0-adc0-f1289ea25b61	cmrvc15vc0021iyq9nl17a2os	Hanging Leg Raise	CORE	3	10-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
650b2971-36de-4258-a489-c08decacb61e	cmrvd8wgq000zg8ob0bkkpzjq	Hanging Leg Raise	CORE	3	10-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
d8663e74-bc95-4b77-b8c7-b76531789eb6	cmrw6a0sl000gkbqusagk51w3	Hanging Leg Raise	CORE	3	10-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
040b24a0-a528-441f-8735-fe73df856c4c	cmrw7q3ce002fkbquny9zw333	Hanging Leg Raise	CORE	3	10-15	\N	60	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
2014e8a1-6518-441e-b885-778e00edef2e	cmrgigyeg00016738y7zlessn	Cable Crunch	CORE	3	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
87f2ed7f-e37c-4019-a178-3a8345660961	gym_default_0000000001	Cable Crunch	CORE	3	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
a1427a5c-e781-4440-8735-b82dbb94790e	cmrvc15vc0021iyq9nl17a2os	Cable Crunch	CORE	3	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
033e6926-8eec-4962-b944-36fe067700e3	cmrvd8wgq000zg8ob0bkkpzjq	Cable Crunch	CORE	3	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
ee258741-cec9-4b06-9fe9-70034e42a178	cmrw6a0sl000gkbqusagk51w3	Cable Crunch	CORE	3	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
4088cbdc-9a63-4b61-a53c-0693b8bedca6	cmrw7q3ce002fkbquny9zw333	Cable Crunch	CORE	3	15-20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
48aafd61-debc-4920-aa92-225fc1ef29ef	cmrgigyeg00016738y7zlessn	Russian Twist	CORE	3	20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
04426ba0-e106-44bb-a396-2636a0c2e781	gym_default_0000000001	Russian Twist	CORE	3	20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
ae42a2f4-0aad-4a02-a016-8e2ac782497b	cmrvc15vc0021iyq9nl17a2os	Russian Twist	CORE	3	20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
70f1d4e3-cff5-42d2-a2bf-c4595a4524cd	cmrvd8wgq000zg8ob0bkkpzjq	Russian Twist	CORE	3	20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
448b3c1d-7cdc-4d5e-a879-e48b6dd4d763	cmrw6a0sl000gkbqusagk51w3	Russian Twist	CORE	3	20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
24333828-53ef-4b92-a1e6-1151e50a9eaa	cmrw7q3ce002fkbquny9zw333	Russian Twist	CORE	3	20	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	WEIGHTED
0817a157-9485-4a46-9af4-94784a70677a	cmrgigyeg00016738y7zlessn	Plank	CORE	3	45-60s	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	TIME
e231bbb6-3ce0-4b43-b892-6512a22afd1b	gym_default_0000000001	Plank	CORE	3	45-60s	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	TIME
b5d2c924-7f0d-4d64-b1ad-2b74c86338bb	cmrvc15vc0021iyq9nl17a2os	Plank	CORE	3	45-60s	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	TIME
bad578dc-8555-4a52-a690-f1e912ea8511	cmrvd8wgq000zg8ob0bkkpzjq	Plank	CORE	3	45-60s	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	TIME
91940190-6351-431c-8197-f7a9eeb0e5bd	cmrw6a0sl000gkbqusagk51w3	Plank	CORE	3	45-60s	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	TIME
c05b05f3-7f2d-48e0-ae8d-9cb64204c232	cmrw7q3ce002fkbquny9zw333	Plank	CORE	3	45-60s	\N	45	t	2026-08-10 11:18:36.868	2026-08-10 11:18:36.868	TIME
\.


--
-- TOC entry 4500 (class 0 OID 19525)
-- Dependencies: 285
-- Data for Name: Gym; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Gym" (id, name, slug, "memberSeq", "receiptSeq", "createdAt", "updatedAt", "registrationToken") FROM stdin;
cmrgigyeg00016738y7zlessn	tast 1	\N	2	2	2026-07-11 15:20:16.035	2026-07-27 07:20:23.385	67eadcac-d587-4989-8bba-ed8c03481fd7
gym_default_0000000001	DOM	\N	55	73	2026-07-11 14:48:48.696	2026-08-17 02:52:02.183	0cfd1814-a232-456b-bd25-54c42890ff1a
cmrvc15vc0021iyq9nl17a2os	Rocky Gym	\N	1	1	2026-07-22 00:16:33.789	2026-07-22 00:20:34.365	2cc521b3-f9c7-46c9-859c-85eae557c920
cmrvd8wgq000zg8ob0bkkpzjq	Lil Gym	\N	1	1	2026-07-22 00:50:34.841	2026-07-22 00:54:01.51	160c16a7-0e98-4124-8404-1faa46fc7368
cmrw6a0sl000gkbqusagk51w3	Sara GYM	\N	1	1	2026-07-22 14:23:15.842	2026-07-22 14:25:40.77	a6a4abba-9efd-4634-bd15-dcfd4f6dfcec
cmrw7q3ce002fkbquny9zw333	HI GYM	\N	0	0	2026-07-22 15:03:45.277	2026-07-22 15:03:45.277	3e362c29-d717-406a-9fcf-a20da571d538
\.


--
-- TOC entry 4505 (class 0 OID 29725)
-- Dependencies: 290
-- Data for Name: GymEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GymEvent" (id, "gymId", title, "eventDate", location, description, "createdAt", "updatedAt") FROM stdin;
cmscf0tmw000he2ts8jgfir2u	gym_default_0000000001	run	2026-08-04	tvh	\N	2026-08-02 23:12:21.803	2026-08-02 23:12:21.803
cmscgfb8d000oe2tsym33xscy	gym_default_0000000001	Cycling	2026-08-06	tvh	\N	2026-08-02 23:51:37.042	2026-08-02 23:51:37.042
\.


--
-- TOC entry 4497 (class 0 OID 18147)
-- Dependencies: 282
-- Data for Name: GymProfile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."GymProfile" (id, name, "logoUrl", address, phone, "ownerNotifyPhone", "ownerNotifyEmail", "createdAt", "updatedAt", "gymId", "membershipPolicyText") FROM stdin;
cmrgigym200056738vd0p9jrd	tast 1	\N	\N	\N	\N	\N	2026-07-11 15:20:16.035	2026-07-11 15:20:16.035	cmrgigyeg00016738y7zlessn	\N
cmrvc166o0025iyq9ukn93w6n	Rocky Gym	\N	\N	\N	\N	\N	2026-07-22 00:16:33.789	2026-07-22 00:16:33.789	cmrvc15vc0021iyq9nl17a2os	\N
cmrvd8wt70013g8obe15dqdbm	Lil Gym	\N	\N	\N	\N	\N	2026-07-22 00:50:34.841	2026-07-22 00:50:34.841	cmrvd8wgq000zg8ob0bkkpzjq	\N
cmrw6a138000kkbqu5bmr99x0	Sara GYM	\N	\N	\N	\N	\N	2026-07-22 14:23:15.842	2026-07-22 14:23:15.842	cmrw6a0sl000gkbqusagk51w3	\N
cmrw7q3lt002jkbqugn2wqu7m	HI GYM	\N	\N	\N	\N	\N	2026-07-22 15:03:45.277	2026-07-22 15:03:45.277	cmrw7q3ce002fkbquny9zw333	\N
cmremipm3000359i0gm6nzeyt	DOM	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	9361527196	geekypeople001@gmail.com	2026-07-10 07:38:04.197	2026-08-06 07:43:49.746	gym_default_0000000001	By joining this gym, I acknowledge and agree to the following:\r\n\r\n- I confirm I am physically fit to participate in gym activities, and I will consult a physician regarding my appropriate exercise regime if needed.\r\n- I understand the gym facilities carry inherent risks, and I will test and satisfy myself about the safety of any equipment before use.\r\n- I release the gym, its management, and staff from any claims, costs, or damages related to injury, loss, or damage arising from my use of the facilities, to the extent permitted by law.\r\n- Membership is non-transferable and for my exclusive use only.\r\n- I will wear appropriate sports attire and non-marking shoes, use a towel during workouts, and follow gym staff instructions.\r\n- Outside food, drinks, and smoking are not permitted on the premises.\r\n- The gym is not responsible for personal belongings; I will use lockers provided.\r\n- Management reserves the right to ask any member to leave for violating these rules.
\.


--
-- TOC entry 4506 (class 0 OID 30449)
-- Dependencies: 291
-- Data for Name: LedgerTransaction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."LedgerTransaction" (id, "gymId", type, category, amount, "occurredOn", note, "createdById", "createdAt", "updatedAt") FROM stdin;
cmsdvysog000fa6uzniuqdip4	gym_default_0000000001	EXPENSE	rent	50000.00	2026-08-04	\N	cmrehsgjt0000myqyllxe5i28	2026-08-03 23:54:27.14	2026-08-03 23:54:27.14
cmsdw1yiz000ya6uz5tbk83sy	gym_default_0000000001	EXPENSE	Salary	10000.00	2026-08-04	For Rock	cmrehsgjt0000myqyllxe5i28	2026-08-03 23:56:54.693	2026-08-03 23:56:54.693
\.


--
-- TOC entry 4494 (class 0 OID 17658)
-- Dependencies: 279
-- Data for Name: Member; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Member" (id, name, phone, notes, "createdAt", "updatedAt", email, "gymId", "memberNumber", "photoUrl", gender, "isPt", "trainerId", "membershipPolicyAgreedText", "membershipPolicyAgreedAt", "portalEnabledAt", "ageYears", "heightCm", "weightKg", "fitnessGoal") FROM stdin;
cmsmy1rof0009tl0boeqzc53o	Abi	9962229991	\N	2026-08-10 08:02:39.732	2026-08-10 08:04:16.093	srevarshan29@gmail.com	gym_default_0000000001	49	\N	MALE	f	\N	By joining this gym, I acknowledge and agree to the following:\r\n\r\n- I confirm I am physically fit to participate in gym activities, and I will consult a physician regarding my appropriate exercise regime if needed.\r\n- I understand the gym facilities carry inherent risks, and I will test and satisfy myself about the safety of any equipment before use.\r\n- I release the gym, its management, and staff from any claims, costs, or damages related to injury, loss, or damage arising from my use of the facilities, to the extent permitted by law.\r\n- Membership is non-transferable and for my exclusive use only.\r\n- I will wear appropriate sports attire and non-marking shoes, use a towel during workouts, and follow gym staff instructions.\r\n- Outside food, drinks, and smoking are not permitted on the premises.\r\n- The gym is not responsible for personal belongings; I will use lockers provided.\r\n- Management reserves the right to ask any member to leave for violating these rules.	2026-08-10 08:02:39.731	2026-08-10 08:03:18.464	25	175	72.0	WEIGHT_LOSS
cmrok7yeq00028kgz7w5ho2w1	Tom	9876543211	\N	2026-07-17 06:31:24.53	2026-08-09 00:16:41.12	\N	gym_default_0000000001	8	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmsnb0y0t000rxdi3tvelynho	Ganesh	90037 49530	\N	2026-08-10 14:05:56.311	2026-08-11 12:22:08.757	poisonhawk622@gmail.com	gym_default_0000000001	50	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/members/cmsnb0y0t000rxdi3tvelynho-1786450928250.jpg	MALE	f	\N	By joining this gym, I acknowledge and agree to the following:\r\n\r\n- I confirm I am physically fit to participate in gym activities, and I will consult a physician regarding my appropriate exercise regime if needed.\r\n- I understand the gym facilities carry inherent risks, and I will test and satisfy myself about the safety of any equipment before use.\r\n- I release the gym, its management, and staff from any claims, costs, or damages related to injury, loss, or damage arising from my use of the facilities, to the extent permitted by law.\r\n- Membership is non-transferable and for my exclusive use only.\r\n- I will wear appropriate sports attire and non-marking shoes, use a towel during workouts, and follow gym staff instructions.\r\n- Outside food, drinks, and smoking are not permitted on the premises.\r\n- The gym is not responsible for personal belongings; I will use lockers provided.\r\n- Management reserves the right to ask any member to leave for violating these rules.	2026-08-10 14:05:55.009	2026-08-11 02:06:08.639	22	195	53.0	STRENGTH_TRAINING
cmst3mzwo001upowli9ofbx96	Basha	94445006058	\N	2026-08-14 15:25:46.261	2026-08-14 15:25:46.261	basha@gmail.com	gym_default_0000000001	53	\N	MALE	f	\N	By joining this gym, I acknowledge and agree to the following:\r\n\r\n- I confirm I am physically fit to participate in gym activities, and I will consult a physician regarding my appropriate exercise regime if needed.\r\n- I understand the gym facilities carry inherent risks, and I will test and satisfy myself about the safety of any equipment before use.\r\n- I release the gym, its management, and staff from any claims, costs, or damages related to injury, loss, or damage arising from my use of the facilities, to the extent permitted by law.\r\n- Membership is non-transferable and for my exclusive use only.\r\n- I will wear appropriate sports attire and non-marking shoes, use a towel during workouts, and follow gym staff instructions.\r\n- Outside food, drinks, and smoking are not permitted on the premises.\r\n- The gym is not responsible for personal belongings; I will use lockers provided.\r\n- Management reserves the right to ask any member to leave for violating these rules.	2026-08-14 15:25:46.262	\N	26	170	79.9	GENERAL_FITNESS
cmrvc6bol003tiyq9x7iwzswm	haaaaaaaaaaa	87784923078	\N	2026-07-22 00:20:34.502	2026-07-22 00:20:34.502	\N	cmrvc15vc0021iyq9nl17a2os	1	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrvddc67002ng8obntxqdmjp	It's me	8778492304	\N	2026-07-22 00:54:01.539	2026-07-22 00:54:01.539	\N	cmrvd8wgq000zg8ob0bkkpzjq	1	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrw6d5b2001kkbqus25s7nmg	lol	87784923078	\N	2026-07-22 14:25:41.504	2026-07-22 14:25:41.504	\N	cmrw6a0sl000gkbqusagk51w3	1	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrol5010000q8kgz2rgup94d	jennie	8778492304	\N	2026-07-17 06:57:06.308	2026-08-09 00:16:41.12	\N	gym_default_0000000001	9	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrsruj790004ryv5ckxad0yp	Jaya	080984020	\N	2026-07-20 05:15:59.882	2026-08-09 00:16:41.12	\N	gym_default_0000000001	10	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmreiat290005sv6s9n7bmfqr	Srevarshan P	9361527196	\N	2026-07-10 05:39:56.869	2026-08-09 00:16:41.12	\N	gym_default_0000000001	1	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmreotr2c00017cqokstvwy0z	Joel Sharon	9361527196	\N	2026-07-10 08:42:38.382	2026-08-09 00:16:41.12	\N	gym_default_0000000001	2	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrepj1sm0001p9m3yvjg85lo	Akshara	9442237398	\N	2026-07-10 09:02:18.631	2026-08-09 00:16:41.12	\N	gym_default_0000000001	3	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrfr9a640001wwpjey9j8rk7	john	9962229991	\N	2026-07-11 02:38:28.345	2026-08-09 00:16:41.12	\N	gym_default_0000000001	4	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrss9uc8000dryv5ffn1bdnu	Mark	0987654421	\N	2026-07-20 05:27:54.376	2026-08-09 00:16:41.12	\N	gym_default_0000000001	11	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrgj8z1i000j673866cyvlhc	Alpha Member 1	1234567889	\N	2026-07-11 15:42:03.128	2026-08-09 00:16:41.12	\N	gym_default_0000000001	5	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrhd1urj000212nsq18weai6	amu	1979797933	\N	2026-07-12 05:36:19.23	2026-08-09 00:16:41.12	\N	gym_default_0000000001	6	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrhda5wd000c12ns2rpj10c5	vsr	200044442	\N	2026-07-12 05:42:46.874	2026-08-09 00:16:41.12	\N	gym_default_0000000001	7	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrssjzxo000iryv5llwzzi7b	jon22	0998765432	\N	2026-07-20 05:35:48.11	2026-08-09 00:16:41.12	\N	gym_default_0000000001	12	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrssofbd000rryv5n7n8t5ud	Indica	9361527198	\N	2026-07-20 05:39:14.715	2026-08-09 00:16:41.12	\N	gym_default_0000000001	13	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrst9nxu000zryv5e6npkpfc	meee	9962229991	\N	2026-07-20 05:55:45.628	2026-08-09 00:16:41.12	\N	gym_default_0000000001	14	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrstckt4001fryv5i4tezzt9	hary	0998765432	\N	2026-07-20 05:58:01.505	2026-08-09 00:16:41.12	\N	gym_default_0000000001	15	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrsutyq6001oryv5e479a658	pal	9361527196	\N	2026-07-20 06:39:32.211	2026-08-09 00:16:41.12	\N	gym_default_0000000001	16	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrups3d400025lbgv24697ub	ray	8778492304	\N	2026-07-21 13:53:39.344	2026-08-09 00:16:41.12	\N	gym_default_0000000001	17	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrupw3yy000b5lbgwvwe4cvy	swetha	8778492304	\N	2026-07-21 13:56:46.769	2026-08-09 00:16:41.12	\N	gym_default_0000000001	18	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrwrgdex001bw9q0k383xnax	Fit	8778492304	\N	2026-07-23 00:16:04.137	2026-08-09 00:16:41.12	\N	gym_default_0000000001	22	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/members/cmrwrgdex001bw9q0k383xnax-1784765765428.png	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrwrklu40022w9q01xu0hyzp	bug	8778492304	\N	2026-07-23 00:19:21.691	2026-08-09 00:16:41.12	\N	gym_default_0000000001	23	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrwsjlta000qxxl41kqvmt07	sreeee	8778492304	\N	2026-07-23 00:46:34.594	2026-08-09 00:16:41.12	\N	gym_default_0000000001	24	\N	MALE	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrwwlvzf002mxxl4oy9tz74s	ram	87784923078	\N	2026-07-23 02:40:19.338	2026-08-09 00:16:41.12	\N	gym_default_0000000001	25	\N	MALE	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrwwosr7003jxxl4ux5orodc	Doja	45666777	\N	2026-07-23 02:42:35.026	2026-08-09 03:09:29.682	doja30330@gmail.com	gym_default_0000000001	26	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/members/cmrwwosr7003jxxl4ux5orodc-1784774739958.jpg	FEMALE	f	\N	\N	\N	2026-08-09 02:50:26.184	30	160	57.0	\N
cmrgj3qcy000a6738ireyyukr	Beta Member 1	1234567899	\N	2026-07-11 15:37:58.595	2026-07-26 00:27:02.026	BetaMember1@gmail.com	cmrgigyeg00016738y7zlessn	1	\N	PREFER_NOT_TO_SAY	t	cmrgigyil00036738gu2u4ohv	\N	\N	\N	\N	\N	\N	\N
cmspdsoon002fyi3y5t1z938j	Dream	89799378633	\N	2026-08-12 00:59:02.623	2026-08-12 01:00:36.03	dream@gmail.com	gym_default_0000000001	51	\N	MALE	t	cmsg3zags000l10lvtsqx5wsk	By joining this gym, I acknowledge and agree to the following:\r\n\r\n- I confirm I am physically fit to participate in gym activities, and I will consult a physician regarding my appropriate exercise regime if needed.\r\n- I understand the gym facilities carry inherent risks, and I will test and satisfy myself about the safety of any equipment before use.\r\n- I release the gym, its management, and staff from any claims, costs, or damages related to injury, loss, or damage arising from my use of the facilities, to the extent permitted by law.\r\n- Membership is non-transferable and for my exclusive use only.\r\n- I will wear appropriate sports attire and non-marking shoes, use a towel during workouts, and follow gym staff instructions.\r\n- Outside food, drinks, and smoking are not permitted on the premises.\r\n- The gym is not responsible for personal belongings; I will use lockers provided.\r\n- Management reserves the right to ask any member to leave for violating these rules.	2026-08-12 00:59:02.622	\N	23	170	58.8	GENERAL_FITNESS
cmstu3ltc0021pdur4hz0ptkx	Daniel	9920262004	\N	2026-08-15 03:46:31.118	2026-08-15 03:46:31.118	daniel@gmail.com	gym_default_0000000001	54	\N	MALE	f	\N	By joining this gym, I acknowledge and agree to the following:\r\n\r\n- I confirm I am physically fit to participate in gym activities, and I will consult a physician regarding my appropriate exercise regime if needed.\r\n- I understand the gym facilities carry inherent risks, and I will test and satisfy myself about the safety of any equipment before use.\r\n- I release the gym, its management, and staff from any claims, costs, or damages related to injury, loss, or damage arising from my use of the facilities, to the extent permitted by law.\r\n- Membership is non-transferable and for my exclusive use only.\r\n- I will wear appropriate sports attire and non-marking shoes, use a towel during workouts, and follow gym staff instructions.\r\n- Outside food, drinks, and smoking are not permitted on the premises.\r\n- The gym is not responsible for personal belongings; I will use lockers provided.\r\n- Management reserves the right to ask any member to leave for violating these rules.	2026-08-15 03:46:31.117	\N	34	170	70.0	MUSCLE_GAIN
cms2wdhn8004h7s7pvtmllr5r	PR	8778492304	\N	2026-07-27 07:20:23.162	2026-07-27 07:20:33.786	\N	cmrgigyeg00016738y7zlessn	2	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/members/cms2wdhn8004h7s7pvtmllr5r-1785136832045.jpg	MALE	t	cmrgigyil00036738gu2u4ohv	\N	\N	\N	\N	\N	\N	\N
cmrur318p000k5lbg4t2jtxsx	sara	8778492304	\N	2026-07-21 14:30:09.263	2026-08-09 00:16:41.12	\N	gym_default_0000000001	19	\N	MALE	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrwxs3v30089xxl433vjuq13	SZA	8778492304	\N	2026-07-23 03:13:08.976	2026-08-09 00:16:41.12	\N	gym_default_0000000001	27	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/members/cmrwxs3v30089xxl433vjuq13-1784776392067.webp	FEMALE	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrwxy6k6009exxl43b08v7py	Drake	8778492304	\N	2026-07-23 03:17:52.542	2026-08-09 00:16:41.12	\N	gym_default_0000000001	28	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/members/cmrwxy6k6009exxl43b08v7py-1784776676021.jpg	MALE	f	\N	\N	\N	\N	\N	\N	\N	\N
cmry5pppg000z4dutp05ncq2n	Bruno Mars	9361527198	\N	2026-07-23 23:43:00.34	2026-08-09 00:16:41.12	\N	gym_default_0000000001	29	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/members/cmry5pppg000z4dutp05ncq2n-1784850185149.webp	MALE	f	\N	\N	\N	\N	\N	\N	\N	\N
cmrycyz720029w1uc23bx75p3	dom	9962229991	\N	2026-07-24 03:06:09.761	2026-08-09 00:16:41.12	\N	gym_default_0000000001	30	\N	MALE	f	\N	\N	\N	\N	\N	\N	\N	\N
cms05q33f009ivml9n2taiu6e	SO	9962229991	\N	2026-07-25 09:18:49.358	2026-08-09 00:16:41.12	\N	gym_default_0000000001	31	\N	MALE	f	\N	\N	\N	\N	\N	\N	\N	\N
cms0ahbno000qwyw704183jkz	ahh	9361527197	\N	2026-07-25 11:31:59.47	2026-08-09 00:16:41.12	\N	gym_default_0000000001	32	\N	MALE	t	cms0galpz000k378clkv15hgo	\N	\N	\N	\N	\N	\N	\N
cmspoli3x000lol7gv1cxra97	Steve	8778492305	\N	2026-08-12 06:01:23.38	2026-08-12 06:02:53.241	steve@gmail.com	gym_default_0000000001	52	\N	MALE	f	\N	By joining this gym, I acknowledge and agree to the following:\r\n\r\n- I confirm I am physically fit to participate in gym activities, and I will consult a physician regarding my appropriate exercise regime if needed.\r\n- I understand the gym facilities carry inherent risks, and I will test and satisfy myself about the safety of any equipment before use.\r\n- I release the gym, its management, and staff from any claims, costs, or damages related to injury, loss, or damage arising from my use of the facilities, to the extent permitted by law.\r\n- Membership is non-transferable and for my exclusive use only.\r\n- I will wear appropriate sports attire and non-marking shoes, use a towel during workouts, and follow gym staff instructions.\r\n- Outside food, drinks, and smoking are not permitted on the premises.\r\n- The gym is not responsible for personal belongings; I will use lockers provided.\r\n- Management reserves the right to ask any member to leave for violating these rules.	2026-08-12 06:01:22.634	2026-08-12 06:02:53.24	22	164	48.0	MUSCLE_GAIN
cms11vl5k00182xt0pwwhelmi	Taylor Swift	9361527197	\N	2026-07-26 00:18:54.441	2026-08-09 00:16:41.12	\N	gym_default_0000000001	33	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/members/cms11vl5k00182xt0pwwhelmi-1785025137408.webp	FEMALE	t	cms12ajzp005d2xt0i484mtbs	\N	\N	\N	\N	\N	\N	\N
cms202ako0028ffa8m2pppgru	Jon s	9361527197	\N	2026-07-26 16:15:54.274	2026-08-09 00:16:41.12	\N	gym_default_0000000001	34	\N	MALE	t	cms0galpz000k378clkv15hgo	\N	\N	\N	\N	\N	\N	\N
cms20d99l0040ffa86gqfd9vw	RRR	9361527198	\N	2026-07-26 16:24:25.424	2026-08-09 00:16:41.12	\N	gym_default_0000000001	35	\N	MALE	f	\N	\N	\N	\N	\N	\N	\N	\N
cms217t3h000mu5zuyf0fo3om	Sre varshan 2.0	9361527197	\N	2026-07-26 16:48:11.182	2026-08-09 00:16:41.12	\N	gym_default_0000000001	36	\N	PREFER_NOT_TO_SAY	f	\N	\N	\N	\N	\N	\N	\N	\N
cms2uao9200157s7p131k9g6m	Travis Scott	9361527197	\N	2026-07-27 06:22:14.006	2026-08-09 00:16:41.12	\N	gym_default_0000000001	38	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/members/cms2uao9200157s7p131k9g6m-1785133335670.webp	MALE	f	\N	\N	\N	\N	\N	\N	\N	\N
cmsb7m8ag00273ebuytiqoddx	Sam@2	9962229991	\N	2026-08-02 02:57:17.579	2026-08-09 00:16:41.12	\N	gym_default_0000000001	39	\N	MALE	f	\N	\N	\N	\N	\N	\N	\N	\N
cmsb8451n003b3ebuwqt4j1x9	Sre varshan 3.0	9962229991	\N	2026-08-02 03:11:13.265	2026-08-09 00:16:41.12	\N	gym_default_0000000001	40	\N	MALE	f	\N	\N	\N	\N	\N	\N	\N	\N
cmsbj92gj006u3ebuqd79k6rz	Ramu	9962229991	\N	2026-08-02 08:22:58.847	2026-08-09 00:16:41.12	\N	gym_default_0000000001	41	\N	MALE	f	\N	\N	\N	\N	\N	\N	\N	\N
cms2sautz00127gvbo49pxm2q	Tyla	9361527196	\N	2026-07-27 05:26:23.095	2026-08-16 08:44:01.302	tyla16889@gmail.com	gym_default_0000000001	37	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/members/cms2sautz00127gvbo49pxm2q-1785129986144.webp	FEMALE	t	cms12ajzp005d2xt0i484mtbs	\N	\N	2026-08-09 03:33:48.584	24	160	60.0	GENERAL_FITNESS
cmswmsxwr000bohx5beujogmq	John	996222467	\N	2026-08-17 02:45:34.442	2026-08-17 02:53:10.001	domfitnessstudio.1@gamil.com	gym_default_0000000001	55	\N	MALE	f	\N	By joining this gym, I acknowledge and agree to the following:\r\n\r\n- I confirm I am physically fit to participate in gym activities, and I will consult a physician regarding my appropriate exercise regime if needed.\r\n- I understand the gym facilities carry inherent risks, and I will test and satisfy myself about the safety of any equipment before use.\r\n- I release the gym, its management, and staff from any claims, costs, or damages related to injury, loss, or damage arising from my use of the facilities, to the extent permitted by law.\r\n- Membership is non-transferable and for my exclusive use only.\r\n- I will wear appropriate sports attire and non-marking shoes, use a towel during workouts, and follow gym staff instructions.\r\n- Outside food, drinks, and smoking are not permitted on the premises.\r\n- The gym is not responsible for personal belongings; I will use lockers provided.\r\n- Management reserves the right to ask any member to leave for violating these rules.	2026-08-17 02:45:34.441	2026-08-17 02:53:10.186	27	160	67.0	MUSCLE_GAIN
\.


--
-- TOC entry 4493 (class 0 OID 17648)
-- Dependencies: 278
-- Data for Name: Package; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Package" (id, name, price, "durationValue", "durationUnit", "isActive", "createdAt", "updatedAt", "gymId") FROM stdin;
cmrei4o8r0000sv6scinjki50	Monthly Plan	1500.00	1	MONTHS	t	2026-07-10 05:35:10.739	2026-07-10 05:35:10.739	gym_default_0000000001
cmrei5w0i0001sv6sg19ty7qy	3 Months Package	3000.00	3	MONTHS	t	2026-07-10 05:36:05.847	2026-07-10 05:36:05.847	gym_default_0000000001
cmrei8j2k0002sv6s0l2814op	Half Yearly Plan	6000.00	6	MONTHS	t	2026-07-10 05:38:10.617	2026-07-10 05:38:10.617	gym_default_0000000001
cmrei8zsq0003sv6sb4h7srma	Yearly Plan	10000.00	12	MONTHS	t	2026-07-10 05:38:32.309	2026-07-10 05:38:32.309	gym_default_0000000001
cmrgj1hkf00076738xa8li0ue	monthly	1000.00	1	MONTHS	t	2026-07-11 15:36:14.002	2026-07-11 15:36:14.002	cmrgigyeg00016738y7zlessn
cmrvc4bbs0033iyq9hb48qgv4	test 1	100000.00	1	MONTHS	t	2026-07-22 00:19:00.824	2026-07-22 00:19:00.824	cmrvc15vc0021iyq9nl17a2os
cmrvdbkes001wg8obpsaik0pr	3 M	120000.00	3	MONTHS	t	2026-07-22 00:52:39.083	2026-07-22 00:52:58.67	cmrvd8wgq000zg8ob0bkkpzjq
cmrw6cfnf0015kbquoc34wgas	Annual	100000.00	12	MONTHS	t	2026-07-22 14:25:08.44	2026-07-22 14:25:08.44	cmrw6a0sl000gkbqusagk51w3
cmspzmdmi0003cqzzkhvcp6nx	Bro	10000.00	1	MONTHS	f	2026-08-12 11:10:00.369	2026-08-12 11:10:27.363	gym_default_0000000001
\.


--
-- TOC entry 4496 (class 0 OID 17674)
-- Dependencies: 281
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Payment" (id, "memberId", "subscriptionId", amount, method, "paidAt", note, "recordedById", "createdAt", "gymId") FROM stdin;
cmreidyre0009sv6slpz8bo8w	cmreiat290005sv6s9n7bmfqr	cmreiat5f0007sv6s3ss4rn2s	3000.00	UPI	2026-07-11 00:00:00	He paid one day late.	cmrehsgjt0000myqyllxe5i28	2026-07-10 05:42:24.272	gym_default_0000000001
cmreotrb700057cqoruxrbt2n	cmreotr2c00017cqokstvwy0z	cmreotr6k00037cqo4oe211qp	1500.00	CASH	2026-07-10 08:42:38.382	\N	cmrehsgjt0000myqyllxe5i28	2026-07-10 08:42:38.382	gym_default_0000000001
cmrepj23r0005p9m3j81rs1a7	cmrepj1sm0001p9m3yvjg85lo	cmrepj1y60003p9m3n5n8zf6u	10000.00	UPI	2026-07-10 09:02:18.631	\N	cmrehsgjt0000myqyllxe5i28	2026-07-10 09:02:18.631	gym_default_0000000001
cmrfrat5w0006wwpjsbh1xsls	cmrfr9a640001wwpjey9j8rk7	cmrfr9abt0003wwpjqdcx6bln	1500.00	CASH	2026-07-11 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-11 02:39:39.599	gym_default_0000000001
cmrok7ytp00068kgz7gkufrml	cmrok7yeq00028kgz7w5ho2w1	cmrok7yl200048kgzfxjtwj23	0.00	CASH	2026-07-17 06:31:24.53	\N	cmrehsgjt0000myqyllxe5i28	2026-07-17 06:31:24.53	gym_default_0000000001
cmrgj3qjp000e6738zrexux3n	cmrgj3qcy000a6738ireyyukr	cmrgj3qgg000c6738wqr5713i	1000.00	UPI	2026-07-11 15:37:58.595	\N	cmrgigyil00036738gu2u4ohv	2026-07-11 15:37:58.595	cmrgigyeg00016738y7zlessn
cmrgjaap6000o6738zhijpqvx	cmrgj8z1i000j673866cyvlhc	cmrgj8z4r000l6738byrzfpl8	3000.00	UPI	2026-07-14 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-11 15:43:04.991	gym_default_0000000001
cmrhd3r3t000712nscr6167bd	cmrhd1urj000212nsq18weai6	cmrhd1uzp000412nsg1jlhu0j	1500.00	UPI	2026-07-13 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-12 05:37:48.071	gym_default_0000000001
cmrokbp81000b8kgz7a1p5gv7	cmrok7yeq00028kgz7w5ho2w1	cmrok7yl200048kgzfxjtwj23	1000.00	CASH	2026-07-20 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-17 06:34:19.216	gym_default_0000000001
cmrokfh1f000g8kgzrbm1qwi8	cmrok7yeq00028kgz7w5ho2w1	cmrok7yl200048kgzfxjtwj23	1000.00	CASH	2026-07-21 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-17 06:37:15.445	gym_default_0000000001
cmrokn3ai000l8kgzq7lc7riq	cmrok7yeq00028kgz7w5ho2w1	cmrok7yl200048kgzfxjtwj23	1500.00	CASH	2026-07-23 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-17 06:43:10.827	gym_default_0000000001
cmrol50cf000u8kgzesw6znbf	cmrol5010000q8kgz2rgup94d	cmrol507z000s8kgzbdizn429	0.00	CASH	2026-07-17 06:57:06.308	\N	cmrehsgjt0000myqyllxe5i28	2026-07-17 06:57:06.308	gym_default_0000000001
cmrol60j5000z8kgzgdlm847q	cmrol5010000q8kgz2rgup94d	cmrol507z000s8kgzbdizn429	1000.00	UPI	2026-07-18 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-17 06:57:53.662	gym_default_0000000001
cmrsrujm50008ryv5ck5xgora	cmrsruj790004ryv5ckxad0yp	cmrsrujem0006ryv5oq0kxr38	1500.00	UPI	2026-07-20 05:15:59.882	\N	cmrehsgjt0000myqyllxe5i28	2026-07-20 05:15:59.882	gym_default_0000000001
cmrssk04d000mryv5gdojz0h8	cmrssjzxo000iryv5llwzzi7b	cmrssk01d000kryv5lkhflv85	1500.00	CASH	2026-07-20 05:35:48.11	\N	cmrehsgjt0000myqyllxe5i28	2026-07-20 05:35:48.11	gym_default_0000000001
cmrstarlp001aryv56yyl96rb	cmrst9nxu000zryv5e6npkpfc	cmrstardz0018ryv5uwf8k27v	1500.00	CASH	2026-07-20 05:56:36.926	\N	cmrehsgjt0000myqyllxe5i28	2026-07-20 05:56:36.926	gym_default_0000000001
cmrups3k700065lbgld4baand	cmrups3d400025lbgv24697ub	cmrups3gr00045lbgzgpmizzs	10000.00	CASH	2026-07-21 13:53:39.344	\N	cmrehsgjt0000myqyllxe5i28	2026-07-21 13:53:39.344	gym_default_0000000001
cmrw6d5s0001okbqujsw2vxwa	cmrw6d5b2001kkbqus25s7nmg	cmrw6d5jn001mkbqu058w7jzi	100000.00	CASH	2026-07-22 14:25:41.504	\N	cmrw6a0yb000ikbquxibx9990	2026-07-22 14:25:41.504	cmrw6a0sl000gkbqusagk51w3
cmrwrgdl6001fw9q0prwd0axi	cmrwrgdex001bw9q0k383xnax	cmrwrgdi1001dw9q026z039ig	3000.00	CASH	2026-07-23 00:16:04.137	\N	cmrehsgjt0000myqyllxe5i28	2026-07-23 00:16:04.137	gym_default_0000000001
cmrwrkm070026w9q0bigq57qr	cmrwrklu40022w9q01xu0hyzp	cmrwrklx70024w9q07993b18h	6000.00	CASH	2026-07-23 00:19:21.691	\N	cmrehsgjt0000myqyllxe5i28	2026-07-23 00:19:21.691	gym_default_0000000001
cmrwsjlz4000uxxl46f9d2rd5	cmrwsjlta000qxxl41kqvmt07	cmrwsjlw7000sxxl43jnmkyzw	3000.00	CASH	2026-07-23 00:46:34.594	\N	cmrehsgjt0000myqyllxe5i28	2026-07-23 00:46:34.594	gym_default_0000000001
cmrwwlwjk002qxxl4vl0e2p8n	cmrwwlvzf002mxxl4oy9tz74s	cmrwwlw60002oxxl47fyxqjpr	5999.99	UPI	2026-07-23 02:40:19.338	\N	cmrehsgjt0000myqyllxe5i28	2026-07-23 02:40:19.338	gym_default_0000000001
cmrwwot5h003nxxl4owo21my5	cmrwwosr7003jxxl4ux5orodc	cmrwwoswi003lxxl4xehebq57	1500.00	CASH	2026-07-23 02:42:35.026	\N	cmrehsgjt0000myqyllxe5i28	2026-07-23 02:42:35.026	gym_default_0000000001
cmry5pqaz00134dut85k2z2v3	cmry5pppg000z4dutp05ncq2n	cmry5pq3e00114dutxe1ms3f9	8000.00	CASH	2026-04-24 06:30:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-23 23:43:00.34	gym_default_0000000001
cmryct80d001ew1uc8hxyehow	cmry5pppg000z4dutp05ncq2n	cmry5pq3e00114dutxe1ms3f9	1000.00	UPI	2026-07-24 06:30:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-24 03:01:41.779	gym_default_0000000001
cmrycyzl8002dw1uc96j0uvh3	cmrycyz720029w1uc23bx75p3	cmrycyzfk002bw1uc8plls80j	6000.00	CASH	2026-07-24 06:30:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-24 03:06:09.761	gym_default_0000000001
cmrhda6aj000g12nsvhacl56o	cmrhda5wd000c12ns2rpj10c5	cmrhda620000e12nsenp5xxds	1500.00	CARD	2026-05-01 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-12 05:42:46.874	gym_default_0000000001
cmrst9o7i0013ryv5vgmgwdv6	cmrst9nxu000zryv5e6npkpfc	cmrst9o270011ryv5mzuz5ux1	1500.00	CASH	2026-06-13 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-20 05:55:45.628	gym_default_0000000001
cmrstckzn001jryv5vo4l2756	cmrstckt4001fryv5i4tezzt9	cmrstckwa001hryv5ku4ub2a0	1500.00	CASH	2026-06-26 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-20 05:58:01.505	gym_default_0000000001
cmrupw45u000f5lbgceiqlu29	cmrupw3yy000b5lbgwvwe4cvy	cmrupw42k000d5lbgxkyg5ir8	10000.00	CASH	2026-04-21 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-21 13:56:46.769	gym_default_0000000001
cmrur31k3000o5lbgej805ti1	cmrur318p000k5lbg4t2jtxsx	cmrur31ef000m5lbgtywfa5bk	5000.00	CASH	2026-03-04 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-21 14:30:09.263	gym_default_0000000001
cmrsutz18001sryv54zuknlh2	cmrsutyq6001oryv5e479a658	cmrsutyvn001qryv5tc0c4lel	1500.00	CASH	2026-07-20 06:39:32.211	\N	\N	2026-07-20 06:39:32.211	gym_default_0000000001
cmrsvf5wq001xryv54nf62zo4	cmrssofbd000rryv5n7n8t5ud	cmrsspkd6000wryv510o90mwu	1000.00	CASH	2026-07-20 06:56:00.359	\N	\N	2026-07-20 06:56:01.489	gym_default_0000000001
cmrsvv1k50022ryv5emi2hsj6	cmrss9uc8000dryv5ffn1bdnu	cmrss9ufb000fryv5pk0sheow	500.00	CASH	2026-07-20 07:08:21.424	\N	\N	2026-07-20 07:08:22.443	gym_default_0000000001
cmrswe0m10027ryv5bn4m2yop	cmrssofbd000rryv5n7n8t5ud	cmrsspkd6000wryv510o90mwu	250.00	UPI	2026-07-23 00:00:00	\N	\N	2026-07-20 07:23:07.594	gym_default_0000000001
cmrswgid6002cryv5usw8iqbp	cmrss9uc8000dryv5ffn1bdnu	cmrss9ufb000fryv5pk0sheow	500.00	CASH	2026-07-23 00:00:00	\N	\N	2026-07-20 07:25:03.912	gym_default_0000000001
cms11vlgo001c2xt0tkz7p3nc	cms11vl5k00182xt0pwwhelmi	cms11vlb3001a2xt05znzfg5g	6000.00	CASH	2026-07-26 00:18:54.441	\N	cmrehsgjt0000myqyllxe5i28	2026-07-26 00:18:54.441	gym_default_0000000001
cms202atn002cffa8dpwq874z	cms202ako0028ffa8m2pppgru	cms202ap0002affa8d57828vf	999.99	CASH	2026-07-26 16:15:54.274	\N	cmrehsgjt0000myqyllxe5i28	2026-07-26 16:15:54.274	gym_default_0000000001
cms20d9kx0044ffa8xvws2g14	cms20d99l0040ffa86gqfd9vw	cms20d9f40042ffa8li62zy8z	500.00	UPI	2026-07-26 16:24:25.424	\N	cmrehsgjt0000myqyllxe5i28	2026-07-26 16:24:25.424	gym_default_0000000001
cms20igd1004nffa870bs1awq	cms20d99l0040ffa86gqfd9vw	cms20d9f40042ffa8li62zy8z	1000.00	UPI	2026-07-31 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-26 16:28:28.167	gym_default_0000000001
cms217te6000qu5zub9aatw93	cms217t3h000mu5zuyf0fo3om	cms217t9m000ou5zuk28929og	99999.99	CASH	2026-07-26 16:48:11.182	\N	cmrehsgjt0000myqyllxe5i28	2026-07-26 16:48:11.182	gym_default_0000000001
cms2sav2400167gvbojoqele7	cms2sautz00127gvbo49pxm2q	cms2sauys00147gvbvigcyttq	10000.00	CARD	2026-07-27 05:26:23.095	\N	cmrehsgjt0000myqyllxe5i28	2026-07-27 05:26:23.095	gym_default_0000000001
cms2uaofm00197s7pdvddl372	cms2uao9200157s7p131k9g6m	cms2uaoc900177s7pvikx99p0	3000.00	CASH	2026-07-27 06:22:14.006	\N	cmrehsgjt0000myqyllxe5i28	2026-07-27 06:22:14.006	gym_default_0000000001
cmsb7m8hh002b3ebuwomgujdq	cmsb7m8ag00273ebuytiqoddx	cmsb7m8dy00293ebuzsyyjm2m	10000.00	CASH	2026-08-02 02:57:17.579	\N	cmrehsgjt0000myqyllxe5i28	2026-08-02 02:57:17.579	gym_default_0000000001
cmrvc6c0c003xiyq9ydbsn72l	cmrvc6bol003tiyq9x7iwzswm	cmrvc6buq003viyq92g1s8ua9	100000.00	BANK_TRANSFER	2026-04-22 00:00:00	\N	cmrvc16110023iyq92n6qwq0s	2026-07-22 00:20:34.502	cmrvc15vc0021iyq9nl17a2os
cmrvddchm002rg8obf6vu06mu	cmrvddc67002ng8obntxqdmjp	cmrvddcbx002pg8ob22cszqea	50000.00	CARD	2026-06-18 00:00:00	\N	cmrvd8wnj0011g8obl9eu9iej	2026-07-22 00:54:01.539	cmrvd8wgq000zg8ob0bkkpzjq
cmrwxs466008dxxl4mjqvutvj	cmrwxs3v30089xxl433vjuq13	cmrwxs40o008bxxl4vaqrkwqf	1500.00	CASH	2026-06-30 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-23 03:13:08.976	gym_default_0000000001
cmrwxy74e009ixxl4eut3w9wr	cmrwxy6k6009exxl43b08v7py	cmrwxy6pv009gxxl4fkfejhhv	1500.00	CASH	2026-06-28 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-23 03:17:52.542	gym_default_0000000001
cms05q3h9009mvml9eo7sflzc	cms05q33f009ivml9n2taiu6e	cms05q36v009kvml9nfb8nhq9	1500.00	CASH	2026-06-24 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-25 09:18:49.358	gym_default_0000000001
cms0ahc35000uwyw7fn3bzyrz	cms0ahbno000qwyw704183jkz	cms0ahbtm000swyw7oanqwklt	10000.00	CASH	2026-06-26 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-07-25 11:31:59.47	gym_default_0000000001
cms2wdj89004l7s7p0i2at46v	cms2wdhn8004h7s7pvtmllr5r	cms2wdia3004j7s7pmg5j5oa3	500.00	UPI	2026-06-24 00:00:00	\N	cmrgigyil00036738gu2u4ohv	2026-07-27 07:20:23.162	cmrgigyeg00016738y7zlessn
cmsb8457i003f3ebuzijjlwuc	cmsb8451n003b3ebuwqt4j1x9	cmsb8454t003d3ebu6exqv9xj	10000.00	CASH	2026-05-14 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-08-02 03:11:13.265	gym_default_0000000001
cmsbj92nr006y3ebu880bagug	cmsbj92gj006u3ebuqd79k6rz	cmsbj92kl006w3ebulohfcklk	10000.00	CASH	2026-05-13 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-08-02 08:22:58.847	gym_default_0000000001
cmsfcn1kz000b8u4ilrtkuo8q	cmrur318p000k5lbg4t2jtxsx	cmrur31ef000m5lbgtywfa5bk	500.00	UPI	2026-08-05 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-08-05 00:28:57.95	gym_default_0000000001
cmsmy1s9p000dtl0b1c1imsor	cmsmy1rof0009tl0boeqzc53o	cmsmy1rz4000btl0byoh1kcl2	1500.00	CASH	2026-08-10 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-08-10 08:02:39.732	gym_default_0000000001
cmsnb0yls000vxdi3njnti57j	cmsnb0y0t000rxdi3tvelynho	cmsnb0ybd000txdi34g3i2m5d	1500.00	CASH	2026-08-10 14:05:53.706	\N	cmrehsgjt0000myqyllxe5i28	2026-08-10 14:05:56.311	gym_default_0000000001
cmspdspu0002jyi3yzn1xdrza	cmspdsoon002fyi3y5t1z938j	cmspdspam002hyi3yw2f4mvz3	1500.00	CARD	2026-07-18 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-08-12 00:59:02.623	gym_default_0000000001
cmspoliox000pol7gtj9opex7	cmspoli3x000lol7gv1cxra97	cmspolieg000nol7gabhaddlh	1700.00	UPI	2026-08-12 06:01:21.89	\N	cmrehsgjt0000myqyllxe5i28	2026-08-12 06:01:23.38	gym_default_0000000001
cmspoq28p001hol7g4e8f76ae	cmrur318p000k5lbg4t2jtxsx	cmrur31ef000m5lbgtywfa5bk	1534.00	UPI	2026-08-12 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-08-12 06:04:56.093	gym_default_0000000001
cmspzjssa000jeecem3k64u2w	cmrwxy6k6009exxl43b08v7py	cmspzjshj000heecefso1ptfb	1500.00	CASH	2026-08-12 11:07:59.677	\N	cmrehsgjt0000myqyllxe5i28	2026-08-12 11:07:59.677	gym_default_0000000001
cmst34xk9000mpowl3w7b99ih	cmry5pppg000z4dutp05ncq2n	cmry5pq3e00114dutxe1ms3f9	1000.00	CASH	2026-08-14 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-08-14 15:11:43.408	gym_default_0000000001
cmst3rdnu002qpowlj8hwut6k	cmst3mzwo001upowli9ofbx96	cmst3n001001wpowluww8x02v	1000.00	CASH	2026-08-14 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-08-14 15:29:10.704	gym_default_0000000001
cmst6gqy90086powlq3n9aqfw	cmrwwlvzf002mxxl4oy9tz74s	cmrwwlw60002oxxl47fyxqjpr	500.00	CASH	2026-08-14 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-08-14 16:44:53.54	gym_default_0000000001
cmstu3m2r0025pdurqpp2z9pw	cmstu3ltc0021pdur4hz0ptkx	cmstu3lx20023pdurdkwunxze	500.00	UPI	2026-07-08 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-08-15 03:46:31.118	gym_default_0000000001
cmstu5r8k002opdurinvm3vth	cmstu3ltc0021pdur4hz0ptkx	cmstu5r2v002mpdur2rgllgil	1000.00	CASH	2026-08-15 03:48:11.374	\N	cmrehsgjt0000myqyllxe5i28	2026-08-15 03:48:11.374	gym_default_0000000001
cmswmsyhy000fohx5x1rxopwu	cmswmsxwr000bohx5beujogmq	cmswmsy7f000dohx57tt2mu82	2000.00	CASH	2026-01-16 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-08-17 02:45:34.442	gym_default_0000000001
cmswmz8g9000doh27gr0va1c6	cmswmsxwr000bohx5beujogmq	cmswmz85t000boh27s1j1khhb	1000.00	CASH	2026-08-17 02:50:28.054	\N	cmrehsgjt0000myqyllxe5i28	2026-08-17 02:50:28.054	gym_default_0000000001
cmswn190p000voh27bz6z1sgs	cmswmsxwr000bohx5beujogmq	cmswmz85t000boh27s1j1khhb	500.00	CASH	2026-08-19 00:00:00	\N	cmrehsgjt0000myqyllxe5i28	2026-08-17 02:52:02.097	gym_default_0000000001
\.


--
-- TOC entry 4499 (class 0 OID 18157)
-- Dependencies: 284
-- Data for Name: Receipt; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Receipt" (id, number, "paymentId", "createdAt", "gymName", "gymAddress", "gymPhone", "gymLogoUrl", "memberId", "memberName", "memberPhone", "memberEmail", "packageName", amount, method, "paidAt", "periodStart", "periodEnd", "gymId", "amountOwed", "balanceAfter") FROM stdin;
cmrem44i1000259i0qa4fzpqw	1	cmreidyre0009sv6slpz8bo8w	2026-07-10 07:26:41.573	My Gym	\N	\N	\N	cmreiat290005sv6s9n7bmfqr	Srevarshan P	9361527196	\N	3 Months Package	3000.00	UPI	2026-07-11 00:00:00	2026-07-10 00:00:00	2026-10-10 00:00:00	gym_default_0000000001	\N	\N
cmreotsg900077cqodqe7f6qn	2	cmreotrb700057cqoruxrbt2n	2026-07-10 08:42:38.382	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmreotr2c00017cqokstvwy0z	Joel Sharon	9361527196	amudhinimangai80@gmail.com	Monthly Plan	1500.00	CASH	2026-07-10 08:42:38.382	2026-07-10 00:00:00	2026-08-10 00:00:00	gym_default_0000000001	\N	\N
cmrepj31x0007p9m374s9osg4	3	cmrepj23r0005p9m3j81rs1a7	2026-07-10 09:02:18.631	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrepj1sm0001p9m3yvjg85lo	Akshara	9442237398	srevarshan29@gmail.com	Yearly Plan	10000.00	UPI	2026-07-10 09:02:18.631	2026-07-10 00:00:00	2027-07-10 00:00:00	gym_default_0000000001	\N	\N
cmrfrau100008wwpjyuwmaj29	4	cmrfrat5w0006wwpjsbh1xsls	2026-07-11 02:39:39.599	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrfr9a640001wwpjey9j8rk7	john	9962229991	amudhinimangai80@gmail.com	Monthly Plan	1500.00	CASH	2026-07-11 00:00:00	2026-07-10 00:00:00	2026-08-10 00:00:00	gym_default_0000000001	\N	\N
cmrgj3r7a000g6738yngtjfnl	1	cmrgj3qjp000e6738zrexux3n	2026-07-11 15:37:58.595	tast 1	\N	\N	\N	cmrgj3qcy000a6738ireyyukr	Beta Member 1	1234567899	BetaMember1@gmail.com	monthly	1000.00	UPI	2026-07-11 15:37:58.595	2026-07-13 00:00:00	2026-08-13 00:00:00	cmrgigyeg00016738y7zlessn	\N	\N
cmrgjabg2000q673827wubpnf	5	cmrgjaap6000o6738zhijpqvx	2026-07-11 15:43:04.991	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrgj8z1i000j673866cyvlhc	Alpha Member 1	1234567889	AlphaMember1@gmail.com	3 Months Package	3000.00	UPI	2026-07-14 00:00:00	2026-07-11 15:42:03.127	2026-10-11 15:42:03.127	gym_default_0000000001	\N	\N
cmrhd3sah000912nsocbzoeew	6	cmrhd3r3t000712nscr6167bd	2026-07-12 05:37:48.071	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrhd1urj000212nsq18weai6	amu	1979797933	amudhinimangai80@gmail.com	Monthly Plan	1500.00	UPI	2026-07-13 00:00:00	2026-07-12 00:00:00	2026-08-12 00:00:00	gym_default_0000000001	\N	\N
cmrok808s00088kgzqqbixryf	8	cmrok7ytp00068kgz7gkufrml	2026-07-17 06:31:24.53	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrok7yeq00028kgz7w5ho2w1	Tom	9876543211	\N	3 Months Package	0.00	CASH	2026-07-17 06:31:24.53	2026-07-17 00:00:00	2026-10-17 00:00:00	gym_default_0000000001	3000.00	3000.00
cmrokbqbo000d8kgzclv7y3uv	9	cmrokbp81000b8kgz7a1p5gv7	2026-07-17 06:34:19.216	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrok7yeq00028kgz7w5ho2w1	Tom	9876543211	\N	3 Months Package	1000.00	CASH	2026-07-20 00:00:00	2026-07-17 00:00:00	2026-10-17 00:00:00	gym_default_0000000001	3000.00	2000.00
cmrokfi5e000i8kgzcfp32f81	10	cmrokfh1f000g8kgzrbm1qwi8	2026-07-17 06:37:15.445	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrok7yeq00028kgz7w5ho2w1	Tom	9876543211	amudhinimangai80@gmail.com	3 Months Package	1000.00	CASH	2026-07-21 00:00:00	2026-07-17 00:00:00	2026-10-17 00:00:00	gym_default_0000000001	3000.00	1000.00
cmrokn4jy000n8kgzcls2wllz	11	cmrokn3ai000l8kgzq7lc7riq	2026-07-17 06:43:10.827	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrok7yeq00028kgz7w5ho2w1	Tom	9876543211	amudhinimangai80@gmail.com	3 Months Package	1500.00	CASH	2026-07-23 00:00:00	2026-07-17 00:00:00	2026-10-17 00:00:00	gym_default_0000000001	3000.00	0.00
cmrol51er000w8kgzov17sjcs	12	cmrol50cf000u8kgzesw6znbf	2026-07-17 06:57:06.308	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrol5010000q8kgz2rgup94d	jennie	8778492304	amudhinimangai80@gmail.com	3 Months Package	0.00	CASH	2026-07-17 06:57:06.308	2026-07-17 00:00:00	2026-10-17 00:00:00	gym_default_0000000001	3000.00	3000.00
cmrol625q00118kgzrt10njfp	13	cmrol60j5000z8kgzgdlm847q	2026-07-17 06:57:53.662	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrol5010000q8kgz2rgup94d	jennie	8778492304	amudhinimangai80@gmail.com	3 Months Package	1000.00	UPI	2026-07-18 00:00:00	2026-07-17 00:00:00	2026-10-17 00:00:00	gym_default_0000000001	3000.00	2000.00
cmrsrukew000aryv57sznrnqd	14	cmrsrujm50008ryv5ck5xgora	2026-07-20 05:15:59.882	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrsruj790004ryv5ckxad0yp	Jaya	080984020	Jaya18@gmail.com	Monthly Plan	1500.00	UPI	2026-07-20 05:15:59.882	2026-07-20 00:00:00	2026-08-20 00:00:00	gym_default_0000000001	1500.00	0.00
cmrssk0tg000oryv5n29xkvo8	15	cmrssk04d000mryv5gdojz0h8	2026-07-20 05:35:48.11	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrssjzxo000iryv5llwzzi7b	jon22	0998765432	\N	Monthly Plan	1500.00	CASH	2026-07-20 05:35:48.11	2026-07-20 00:00:00	2026-08-20 00:00:00	gym_default_0000000001	1500.00	0.00
cmrstasgk001cryv56noaqupj	17	cmrstarlp001aryv56yyl96rb	2026-07-20 05:56:36.926	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrst9nxu000zryv5e6npkpfc	meee	9962229991	\N	Monthly Plan	1500.00	CASH	2026-07-20 05:56:36.926	2026-07-20 05:56:36.925	2026-08-20 05:56:36.925	gym_default_0000000001	1500.00	0.00
cmrsuu0at001uryv59hgv6ler	19	cmrsutz18001sryv54zuknlh2	2026-07-20 06:39:32.211	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrsutyq6001oryv5e479a658	pal	9361527196	\N	Monthly Plan	1500.00	CASH	2026-07-20 06:39:32.211	2026-07-20 00:00:00	2026-08-20 00:00:00	gym_default_0000000001	1500.00	0.00
cmrsvf78s001zryv5x3xiz2hu	20	cmrsvf5wq001xryv54nf62zo4	2026-07-20 06:56:01.489	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrssofbd000rryv5n7n8t5ud	Indica	9361527198	srevarshan29@gmail.com	Monthly Plan	1000.00	CASH	2026-07-20 06:56:00.359	2026-08-20 00:00:00	2026-09-20 00:00:00	gym_default_0000000001	1500.00	500.00
cmrsvv2tw0024ryv5fozak4h2	21	cmrsvv1k50022ryv5emi2hsj6	2026-07-20 07:08:22.443	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrss9uc8000dryv5ffn1bdnu	Mark	0987654421	\N	Monthly Plan	500.00	CASH	2026-07-20 07:08:21.424	2026-07-20 00:00:00	2026-08-20 00:00:00	gym_default_0000000001	1500.00	1000.00
cmrswe28c0029ryv5dny57kwj	22	cmrswe0m10027ryv5bn4m2yop	2026-07-20 07:23:07.594	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrssofbd000rryv5n7n8t5ud	Indica	9361527198	srevarshan29@gmail.com	Monthly Plan	250.00	UPI	2026-07-23 00:00:00	2026-08-20 00:00:00	2026-09-20 00:00:00	gym_default_0000000001	1500.00	250.00
cmrswgjiw002eryv5wwwar9u9	23	cmrswgid6002cryv5usw8iqbp	2026-07-20 07:25:03.912	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrss9uc8000dryv5ffn1bdnu	Mark	0987654421	\N	Monthly Plan	500.00	CASH	2026-07-23 00:00:00	2026-07-20 00:00:00	2026-08-20 00:00:00	gym_default_0000000001	1500.00	500.00
cmrups4ac00085lbgk9lk5bfv	24	cmrups3k700065lbgld4baand	2026-07-21 13:53:39.344	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrups3d400025lbgv24697ub	ray	8778492304	\N	Yearly Plan	10000.00	CASH	2026-07-21 13:53:39.344	2026-07-21 00:00:00	2027-07-21 00:00:00	gym_default_0000000001	10000.00	0.00
cmrw6d766001qkbqubpeo1u4u	1	cmrw6d5s0001okbqujsw2vxwa	2026-07-22 14:25:41.504	Sara GYM	\N	\N	\N	cmrw6d5b2001kkbqus25s7nmg	lol	87784923078	\N	Annual	100000.00	CASH	2026-07-22 14:25:41.504	2026-07-22 00:00:00	2027-07-22 00:00:00	cmrw6a0sl000gkbqusagk51w3	100000.00	0.00
cmrwrge5m001hw9q09nz0is6z	29	cmrwrgdl6001fw9q0prwd0axi	2026-07-23 00:16:04.137	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrwrgdex001bw9q0k383xnax	Fit	8778492304	\N	3 Months Package	3000.00	CASH	2026-07-23 00:16:04.137	2026-07-23 00:00:00	2026-10-23 00:00:00	gym_default_0000000001	3000.00	0.00
cmrwrkml90028w9q0lb46zds4	30	cmrwrkm070026w9q0bigq57qr	2026-07-23 00:19:21.691	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrwrklu40022w9q01xu0hyzp	bug	8778492304	\N	Half Yearly Plan	6000.00	CASH	2026-07-23 00:19:21.691	2026-07-23 00:00:00	2027-01-23 00:00:00	gym_default_0000000001	6000.00	0.00
cmrwsjmk2000wxxl4r1n5irpg	31	cmrwsjlz4000uxxl46f9d2rd5	2026-07-23 00:46:34.594	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrwsjlta000qxxl41kqvmt07	sreeee	8778492304	\N	3 Months Package	3000.00	CASH	2026-07-23 00:46:34.594	2026-07-23 00:00:00	2026-10-23 00:00:00	gym_default_0000000001	3000.00	0.00
cmrwwlxy0002sxxl4f0gaufop	32	cmrwwlwjk002qxxl4vl0e2p8n	2026-07-23 02:40:19.338	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrwwlvzf002mxxl4oy9tz74s	ram	87784923078	\N	Yearly Plan	5999.99	UPI	2026-07-23 02:40:19.338	2026-07-23 00:00:00	2027-07-23 00:00:00	gym_default_0000000001	10000.00	4000.01
cmrwwouf2003pxxl4vsudu2fl	33	cmrwwot5h003nxxl4owo21my5	2026-07-23 02:42:35.026	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrwwosr7003jxxl4ux5orodc	Doja	45666777	\N	3 Months Package	1500.00	CASH	2026-07-23 02:42:35.026	2026-07-23 00:00:00	2026-10-23 00:00:00	gym_default_0000000001	3000.00	1500.00
cmry5pse000154dutujfrxy91	36	cmry5pqaz00134dut85k2z2v3	2026-07-23 23:43:00.34	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmry5pppg000z4dutp05ncq2n	Bruno Mars	9361527198	\N	Yearly Plan	8000.00	CASH	2026-04-24 06:30:00	2026-04-24 06:30:00	2027-04-24 06:30:00	gym_default_0000000001	10000.00	2000.00
cmryct9ol001gw1ucoe32yfxu	37	cmryct80d001ew1uc8hxyehow	2026-07-24 03:01:41.779	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmry5pppg000z4dutp05ncq2n	Bruno Mars	9361527198	\N	Yearly Plan	1000.00	UPI	2026-07-24 06:30:00	2026-04-24 06:30:00	2027-04-24 06:30:00	gym_default_0000000001	10000.00	1000.00
cmrycz0rs002fw1ucjnhcy85f	38	cmrycyzl8002dw1uc96j0uvh3	2026-07-24 03:06:09.761	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrycyz720029w1uc23bx75p3	dom	9962229991	\N	Half Yearly Plan	6000.00	CASH	2026-07-24 06:30:00	2026-07-24 06:30:00	2027-01-24 06:30:00	gym_default_0000000001	6000.00	0.00
cms11vmq2001e2xt0p4zeiazt	41	cms11vlgo001c2xt0tkz7p3nc	2026-07-26 00:18:54.441	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cms11vl5k00182xt0pwwhelmi	Taylor Swift	9361527197	\N	Half Yearly Plan	6000.00	CASH	2026-07-26 00:18:54.441	2026-07-26 00:00:00	2027-01-26 00:00:00	gym_default_0000000001	6000.00	0.00
cms202bvx002effa8vo53qqvl	42	cms202atn002cffa8dpwq874z	2026-07-26 16:15:54.274	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cms202ako0028ffa8m2pppgru	Jon s	9361527197	\N	Monthly Plan	999.99	CASH	2026-07-26 16:15:54.274	2026-07-26 00:00:00	2026-08-26 00:00:00	gym_default_0000000001	1500.00	500.01
cms20dbms0046ffa8jw3roe0l	43	cms20d9kx0044ffa8xvws2g14	2026-07-26 16:24:25.424	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cms20d99l0040ffa86gqfd9vw	RRR	9361527198	\N	Monthly Plan	500.00	UPI	2026-07-26 16:24:25.424	2026-07-26 00:00:00	2026-08-26 00:00:00	gym_default_0000000001	1500.00	1000.00
cms20ihv3004pffa882qh3qgd	44	cms20igd1004nffa870bs1awq	2026-07-26 16:28:28.167	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cms20d99l0040ffa86gqfd9vw	RRR	9361527198	\N	Monthly Plan	1000.00	UPI	2026-07-31 00:00:00	2026-07-26 00:00:00	2026-08-26 00:00:00	gym_default_0000000001	1500.00	0.00
cms217uj7000su5zunk3qlxec	45	cms217te6000qu5zub9aatw93	2026-07-26 16:48:11.182	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cms217t3h000mu5zuyf0fo3om	Sre varshan 2.0	9361527197	\N	Yearly Plan	99999.99	CASH	2026-07-26 16:48:11.182	2026-07-26 00:00:00	2027-07-26 00:00:00	gym_default_0000000001	10000.00	0.00
cms2sawaj00187gvbw4px1bvg	46	cms2sav2400167gvbojoqele7	2026-07-27 05:26:23.095	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cms2sautz00127gvbo49pxm2q	Tyla	9361527196	\N	Yearly Plan	10000.00	CARD	2026-07-27 05:26:23.095	2026-07-29 00:00:00	2027-07-29 00:00:00	gym_default_0000000001	10000.00	0.00
cms2uap2o001b7s7pkah1u2pm	47	cms2uaofm00197s7pdvddl372	2026-07-27 06:22:14.006	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cms2uao9200157s7p131k9g6m	Travis Scott	9361527197	\N	3 Months Package	3000.00	CASH	2026-07-27 06:22:14.006	2026-07-27 00:00:00	2026-10-27 00:00:00	gym_default_0000000001	3000.00	0.00
cmsb7m96h002d3ebuv85dxm0f	48	cmsb7m8hh002b3ebuwomgujdq	2026-08-02 02:57:17.579	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmsb7m8ag00273ebuytiqoddx	Sam@2	9962229991	\N	Yearly Plan	10000.00	CASH	2026-08-02 02:57:17.579	2026-08-02 00:00:00	2027-08-02 00:00:00	gym_default_0000000001	10000.00	0.00
cmrhda83y000i12ns51ws57sv	7	cmrhda6aj000g12nsvhacl56o	2026-07-12 05:42:46.874	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrhda5wd000c12ns2rpj10c5	vsr	200044442	amudhinimangai80@gmail.com	Monthly Plan	1500.00	CARD	2026-05-01 00:00:00	2026-05-01 00:00:00	2026-06-01 00:00:00	gym_default_0000000001	\N	\N
cmrst9p1j0015ryv54uynvf5o	16	cmrst9o7i0013ryv5vgmgwdv6	2026-07-20 05:55:45.628	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrst9nxu000zryv5e6npkpfc	meee	9962229991	\N	Monthly Plan	1500.00	CASH	2026-06-13 00:00:00	2026-06-13 00:00:00	2026-07-13 00:00:00	gym_default_0000000001	1500.00	0.00
cmrstclta001lryv5mfrpsu9b	18	cmrstckzn001jryv5vo4l2756	2026-07-20 05:58:01.505	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrstckt4001fryv5i4tezzt9	hary	0998765432	\N	Monthly Plan	1500.00	CASH	2026-06-26 00:00:00	2026-06-26 00:00:00	2026-07-26 00:00:00	gym_default_0000000001	1500.00	0.00
cmrupw4uh000h5lbgyb5hmqs2	25	cmrupw45u000f5lbgceiqlu29	2026-07-21 13:56:46.769	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrupw3yy000b5lbgwvwe4cvy	swetha	8778492304	\N	Yearly Plan	10000.00	CASH	2026-04-21 00:00:00	2026-04-21 00:00:00	2027-04-21 00:00:00	gym_default_0000000001	10000.00	0.00
cmrur32tl000q5lbgmtgftb3k	26	cmrur31k3000o5lbgej805ti1	2026-07-21 14:30:09.263	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrur318p000k5lbg4t2jtxsx	sara	8778492304	\N	Yearly Plan	5000.00	CASH	2026-03-04 00:00:00	2026-03-04 00:00:00	2027-03-04 00:00:00	gym_default_0000000001	10000.00	5000.00
cmrvc6dcm003ziyq9995saeyx	1	cmrvc6c0c003xiyq9ydbsn72l	2026-07-22 00:20:34.502	Rocky Gym	\N	\N	\N	cmrvc6bol003tiyq9x7iwzswm	haaaaaaaaaaa	87784923078	\N	test 1	100000.00	BANK_TRANSFER	2026-04-22 00:00:00	2026-04-22 00:00:00	2026-05-22 00:00:00	cmrvc15vc0021iyq9nl17a2os	100000.00	0.00
cmrvdddr4002tg8ob141vioyt	1	cmrvddchm002rg8obf6vu06mu	2026-07-22 00:54:01.539	Lil Gym	\N	\N	\N	cmrvddc67002ng8obntxqdmjp	It's me	8778492304	\N	3 M	50000.00	CARD	2026-06-18 00:00:00	2026-06-18 00:00:00	2026-09-18 00:00:00	cmrvd8wgq000zg8ob0bkkpzjq	120000.00	70000.00
cmrwxs5h4008fxxl4no13c06r	34	cmrwxs466008dxxl4mjqvutvj	2026-07-23 03:13:08.976	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrwxs3v30089xxl433vjuq13	SZA	8778492304	\N	Monthly Plan	1500.00	CASH	2026-06-30 00:00:00	2026-06-30 00:00:00	2026-07-30 00:00:00	gym_default_0000000001	1500.00	0.00
cmrwxy8p2009kxxl4yykibcam	35	cmrwxy74e009ixxl4eut3w9wr	2026-07-23 03:17:52.542	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrwxy6k6009exxl43b08v7py	Drake	8778492304	\N	Monthly Plan	1500.00	CASH	2026-06-28 00:00:00	2026-06-28 00:00:00	2026-07-28 00:00:00	gym_default_0000000001	1500.00	0.00
cms05q4z0009ovml9gnzgx4q6	39	cms05q3h9009mvml9eo7sflzc	2026-07-25 09:18:49.358	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cms05q33f009ivml9n2taiu6e	SO	9962229991	\N	Monthly Plan	1500.00	CASH	2026-06-24 00:00:00	2026-06-24 00:00:00	2026-07-24 00:00:00	gym_default_0000000001	1500.00	0.00
cms2wdmlw004n7s7pmjxcq8tj	2	cms2wdj89004l7s7p0i2at46v	2026-07-27 07:20:23.162	tast 1	\N	\N	\N	cms2wdhn8004h7s7pvtmllr5r	PR	8778492304	\N	monthly	500.00	UPI	2026-06-24 00:00:00	2026-06-24 00:00:00	2026-07-24 00:00:00	cmrgigyeg00016738y7zlessn	1000.00	500.00
cms0ahdd6000wwyw7jmzlmi7t	40	cms0ahc35000uwyw7fn3bzyrz	2026-07-25 11:31:59.47	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cms0ahbno000qwyw704183jkz	ahh	9361527197	\N	Yearly Plan	10000.00	CASH	2026-06-26 00:00:00	2026-06-26 00:00:00	2027-06-26 00:00:00	gym_default_0000000001	10000.00	0.00
cmsb845sk003h3ebufz46uu5a	49	cmsb8457i003f3ebuzijjlwuc	2026-08-02 03:11:13.265	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmsb8451n003b3ebuwqt4j1x9	Sre varshan 3.0	9962229991	\N	Yearly Plan	10000.00	CASH	2026-05-14 00:00:00	2026-05-14 00:00:00	2027-05-14 00:00:00	gym_default_0000000001	10000.00	0.00
cmsbj93al00703ebuor2q080s	50	cmsbj92nr006y3ebu880bagug	2026-08-02 08:22:58.847	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmsbj92gj006u3ebuqd79k6rz	Ramu	9962229991	\N	Yearly Plan	10000.00	CASH	2026-05-13 00:00:00	2026-05-13 00:00:00	2027-05-13 00:00:00	gym_default_0000000001	10000.00	0.00
cmsfcn3w3000d8u4ilm1ycunm	51	cmsfcn1kz000b8u4ilrtkuo8q	2026-08-05 00:28:57.95	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrur318p000k5lbg4t2jtxsx	sara	8778492304	\N	Yearly Plan	500.00	UPI	2026-08-05 00:00:00	2026-03-04 00:00:00	2027-03-04 00:00:00	gym_default_0000000001	10000.00	4500.00
cmsmy1ukk000ftl0bnxmjcocu	60	cmsmy1s9p000dtl0b1c1imsor	2026-08-10 08:02:39.732	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmsmy1rof0009tl0boeqzc53o	Abi	9962229991	abi@gmail.com	Monthly Plan	1500.00	CASH	2026-08-10 00:00:00	2026-08-10 00:00:00	2026-09-10 00:00:00	gym_default_0000000001	1500.00	0.00
cmsnb10wd000xxdi3k7w4oj14	61	cmsnb0yls000vxdi3njnti57j	2026-08-10 14:05:56.311	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmsnb0y0t000rxdi3tvelynho	Ganesh	90037 49530	poisonhawk622@gmail.com	3 Months Package	1500.00	CASH	2026-08-10 14:05:53.706	2026-08-10 14:05:53.706	2026-11-10 14:05:53.706	gym_default_0000000001	3000.00	1500.00
cmspdstm5002lyi3y4c5ewn6x	62	cmspdspu0002jyi3yzn1xdrza	2026-08-12 00:59:02.623	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmspdsoon002fyi3y5t1z938j	Dream	89799378633	dream@gmail.com	Monthly Plan	1500.00	CARD	2026-07-18 00:00:00	2026-07-18 00:00:00	2026-08-18 00:00:00	gym_default_0000000001	1500.00	0.00
cmspolkzr000rol7grjq0f5mg	63	cmspoliox000pol7gtj9opex7	2026-08-12 06:01:23.38	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmspoli3x000lol7gv1cxra97	Steve	8778492305	steve@gmail.com	3 Months Package	1700.00	UPI	2026-08-12 06:01:21.89	2026-08-12 06:01:21.89	2026-11-12 06:01:21.89	gym_default_0000000001	3000.00	1300.00
cmspoq4ev001jol7g7er7m4qh	64	cmspoq28p001hol7g4e8f76ae	2026-08-12 06:04:56.093	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrur318p000k5lbg4t2jtxsx	sara	8778492304	\N	Yearly Plan	1534.00	UPI	2026-08-12 00:00:00	2026-03-04 00:00:00	2027-03-04 00:00:00	gym_default_0000000001	10000.00	2966.00
cmspzjv39000leeceyclu9d9y	65	cmspzjssa000jeecem3k64u2w	2026-08-12 11:07:59.677	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrwxy6k6009exxl43b08v7py	Drake	8778492304	\N	Monthly Plan	1500.00	CASH	2026-08-12 11:07:59.677	2026-08-12 11:07:59.676	2026-09-12 11:07:59.676	gym_default_0000000001	1500.00	0.00
cmst34yb2000opowlr7itm5v1	66	cmst34xk9000mpowl3w7b99ih	2026-08-14 15:11:43.408	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmry5pppg000z4dutp05ncq2n	Bruno Mars	9361527198	\N	Yearly Plan	1000.00	CASH	2026-08-14 00:00:00	2026-04-24 06:30:00	2027-04-24 06:30:00	gym_default_0000000001	10000.00	0.00
cmst3red3002spowlew324ad8	67	cmst3rdnu002qpowlj8hwut6k	2026-08-14 15:29:10.704	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmst3mzwo001upowli9ofbx96	Basha	94445006058	basha@gmail.com	Monthly Plan	1000.00	CASH	2026-08-14 00:00:00	2026-07-10 00:00:00	2026-08-10 00:00:00	gym_default_0000000001	1500.00	500.00
cmst6grrp0088powl48o3caxu	68	cmst6gqy90086powlq3n9aqfw	2026-08-14 16:44:53.54	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmrwwlvzf002mxxl4oy9tz74s	ram	87784923078	\N	Yearly Plan	500.00	CASH	2026-08-14 00:00:00	2026-07-23 00:00:00	2027-07-23 00:00:00	gym_default_0000000001	10000.00	3500.01
cmstu3ms00027pdur56ubiyma	69	cmstu3m2r0025pdurqpp2z9pw	2026-08-15 03:46:31.118	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmstu3ltc0021pdur4hz0ptkx	Daniel	9920262004	daniel@gmail.com	Monthly Plan	500.00	UPI	2026-07-08 00:00:00	2026-07-08 00:00:00	2026-08-08 00:00:00	gym_default_0000000001	1500.00	1000.00
cmstu5skv002qpdurmz6k6mpm	70	cmstu5r8k002opdurinvm3vth	2026-08-15 03:48:11.374	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmstu3ltc0021pdur4hz0ptkx	Daniel	9920262004	daniel@gmail.com	Monthly Plan	1000.00	CASH	2026-08-15 03:48:11.374	2026-08-15 03:48:11.373	2026-09-15 03:48:11.373	gym_default_0000000001	1500.00	500.00
cmswmt0t4000hohx5ohmw9di1	71	cmswmsyhy000fohx5x1rxopwu	2026-08-17 02:45:34.442	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmswmsxwr000bohx5beujogmq	John	996222467	domfitnessstudio.1@gamil.com	3 Months Package	2000.00	CASH	2026-01-16 00:00:00	2026-01-16 00:00:00	2026-04-16 00:00:00	gym_default_0000000001	3000.00	1000.00
cmswmzar5000foh277umhm9ls	72	cmswmz8g9000doh27gr0va1c6	2026-08-17 02:50:28.054	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmswmsxwr000bohx5beujogmq	John	996222467	domfitnessstudio.1@gamil.com	Monthly Plan	1000.00	CASH	2026-08-17 02:50:28.054	2026-08-17 02:50:28.053	2026-09-17 02:50:28.053	gym_default_0000000001	1500.00	500.00
cmswn1b6a000xoh275fsidpg5	73	cmswn190p000voh27bz6z1sgs	2026-08-17 02:52:02.097	DOM	1/143, OMR Rd, opp. HDFC bank, Padur, Tamil Nadu 603103	\N	https://rcxmdoaxfshznwzzecdz.supabase.co/storage/v1/object/public/gym-assets/logo-1783672862852.png	cmswmsxwr000bohx5beujogmq	John	996222467	domfitnessstudio.1@gamil.com	Monthly Plan	500.00	CASH	2026-08-19 00:00:00	2026-08-17 02:50:28.053	2026-09-17 02:50:28.053	gym_default_0000000001	1500.00	0.00
\.


--
-- TOC entry 4512 (class 0 OID 30658)
-- Dependencies: 297
-- Data for Name: StaffLoginThrottle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StaffLoginThrottle" (key, "failCount", "windowEndsAt", "updatedAt") FROM stdin;
staff-login:ip:142966d143331c092a4392521b7e5b4466582db4	5	2026-09-01 09:45:02.141	2026-09-01 09:32:51.602
\.


--
-- TOC entry 4495 (class 0 OID 17666)
-- Dependencies: 280
-- Data for Name: Subscription; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Subscription" (id, "memberId", "packageId", "startDate", "endDate", "priceAtPurchase", "createdById", "createdAt", "gymId", "writtenOffAmount", "writtenOffAt", "writtenOffById") FROM stdin;
cmreiat5f0007sv6s3ss4rn2s	cmreiat290005sv6s9n7bmfqr	cmrei5w0i0001sv6sg19ty7qy	2026-07-10 00:00:00	2026-10-10 00:00:00	3000.00	cmrehsgjt0000myqyllxe5i28	2026-07-10 05:39:56.869	gym_default_0000000001	0.00	\N	\N
cmreotr6k00037cqo4oe211qp	cmreotr2c00017cqokstvwy0z	cmrei4o8r0000sv6scinjki50	2026-07-10 00:00:00	2026-08-10 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-07-10 08:42:38.382	gym_default_0000000001	0.00	\N	\N
cmrepj1y60003p9m3n5n8zf6u	cmrepj1sm0001p9m3yvjg85lo	cmrei8zsq0003sv6sb4h7srma	2026-07-10 00:00:00	2027-07-10 00:00:00	10000.00	cmrehsgjt0000myqyllxe5i28	2026-07-10 09:02:18.631	gym_default_0000000001	0.00	\N	\N
cmrfr9abt0003wwpjqdcx6bln	cmrfr9a640001wwpjey9j8rk7	cmrei4o8r0000sv6scinjki50	2026-07-10 00:00:00	2026-08-10 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-07-11 02:38:28.345	gym_default_0000000001	0.00	\N	\N
cmrok7yl200048kgzfxjtwj23	cmrok7yeq00028kgz7w5ho2w1	cmrei5w0i0001sv6sg19ty7qy	2026-07-17 00:00:00	2026-10-17 00:00:00	3000.00	cmrehsgjt0000myqyllxe5i28	2026-07-17 06:31:24.53	gym_default_0000000001	0.00	\N	\N
cmrgj3qgg000c6738wqr5713i	cmrgj3qcy000a6738ireyyukr	cmrgj1hkf00076738xa8li0ue	2026-07-13 00:00:00	2026-08-13 00:00:00	1000.00	cmrgigyil00036738gu2u4ohv	2026-07-11 15:37:58.595	cmrgigyeg00016738y7zlessn	0.00	\N	\N
cmrgj8z4r000l6738byrzfpl8	cmrgj8z1i000j673866cyvlhc	cmrei5w0i0001sv6sg19ty7qy	2026-07-11 15:42:03.127	2026-10-11 15:42:03.127	3000.00	cmrehsgjt0000myqyllxe5i28	2026-07-11 15:42:03.128	gym_default_0000000001	0.00	\N	\N
cmrhd1uzp000412nsg1jlhu0j	cmrhd1urj000212nsq18weai6	cmrei4o8r0000sv6scinjki50	2026-07-12 00:00:00	2026-08-12 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-07-12 05:36:19.23	gym_default_0000000001	0.00	\N	\N
cmrhda620000e12nsenp5xxds	cmrhda5wd000c12ns2rpj10c5	cmrei4o8r0000sv6scinjki50	2026-05-01 00:00:00	2026-06-01 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-07-12 05:42:46.874	gym_default_0000000001	0.00	\N	\N
cmrol507z000s8kgzbdizn429	cmrol5010000q8kgz2rgup94d	cmrei5w0i0001sv6sg19ty7qy	2026-07-17 00:00:00	2026-10-17 00:00:00	3000.00	cmrehsgjt0000myqyllxe5i28	2026-07-17 06:57:06.308	gym_default_0000000001	0.00	\N	\N
cmrsrujem0006ryv5oq0kxr38	cmrsruj790004ryv5ckxad0yp	cmrei4o8r0000sv6scinjki50	2026-07-20 00:00:00	2026-08-20 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-07-20 05:15:59.882	gym_default_0000000001	0.00	\N	\N
cmrssk01d000kryv5lkhflv85	cmrssjzxo000iryv5llwzzi7b	cmrei4o8r0000sv6scinjki50	2026-07-20 00:00:00	2026-08-20 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-07-20 05:35:48.11	gym_default_0000000001	0.00	\N	\N
cmrst9o270011ryv5mzuz5ux1	cmrst9nxu000zryv5e6npkpfc	cmrei4o8r0000sv6scinjki50	2026-06-13 00:00:00	2026-07-13 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-07-20 05:55:45.628	gym_default_0000000001	0.00	\N	\N
cmrstardz0018ryv5uwf8k27v	cmrst9nxu000zryv5e6npkpfc	cmrei4o8r0000sv6scinjki50	2026-07-20 05:56:36.925	2026-08-20 05:56:36.925	1500.00	cmrehsgjt0000myqyllxe5i28	2026-07-20 05:56:36.926	gym_default_0000000001	0.00	\N	\N
cmrstckwa001hryv5ku4ub2a0	cmrstckt4001fryv5i4tezzt9	cmrei4o8r0000sv6scinjki50	2026-06-26 00:00:00	2026-07-26 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-07-20 05:58:01.505	gym_default_0000000001	0.00	\N	\N
cmrups3gr00045lbgzgpmizzs	cmrups3d400025lbgv24697ub	cmrei8zsq0003sv6sb4h7srma	2026-07-21 00:00:00	2027-07-21 00:00:00	10000.00	cmrehsgjt0000myqyllxe5i28	2026-07-21 13:53:39.344	gym_default_0000000001	0.00	\N	\N
cmrupw42k000d5lbgxkyg5ir8	cmrupw3yy000b5lbgwvwe4cvy	cmrei8zsq0003sv6sb4h7srma	2026-04-21 00:00:00	2027-04-21 00:00:00	10000.00	cmrehsgjt0000myqyllxe5i28	2026-07-21 13:56:46.769	gym_default_0000000001	0.00	\N	\N
cmrur31ef000m5lbgtywfa5bk	cmrur318p000k5lbg4t2jtxsx	cmrei8zsq0003sv6sb4h7srma	2026-03-04 00:00:00	2027-03-04 00:00:00	10000.00	cmrehsgjt0000myqyllxe5i28	2026-07-21 14:30:09.263	gym_default_0000000001	0.00	\N	\N
cmrvc6buq003viyq92g1s8ua9	cmrvc6bol003tiyq9x7iwzswm	cmrvc4bbs0033iyq9hb48qgv4	2026-04-22 00:00:00	2026-05-22 00:00:00	100000.00	cmrvc16110023iyq92n6qwq0s	2026-07-22 00:20:34.502	cmrvc15vc0021iyq9nl17a2os	0.00	\N	\N
cmrvddcbx002pg8ob22cszqea	cmrvddc67002ng8obntxqdmjp	cmrvdbkes001wg8obpsaik0pr	2026-06-18 00:00:00	2026-09-18 00:00:00	120000.00	cmrvd8wnj0011g8obl9eu9iej	2026-07-22 00:54:01.539	cmrvd8wgq000zg8ob0bkkpzjq	0.00	\N	\N
cmrw6d5jn001mkbqu058w7jzi	cmrw6d5b2001kkbqus25s7nmg	cmrw6cfnf0015kbquoc34wgas	2026-07-22 00:00:00	2027-07-22 00:00:00	100000.00	cmrw6a0yb000ikbquxibx9990	2026-07-22 14:25:41.504	cmrw6a0sl000gkbqusagk51w3	0.00	\N	\N
cmrwrgdi1001dw9q026z039ig	cmrwrgdex001bw9q0k383xnax	cmrei5w0i0001sv6sg19ty7qy	2026-07-23 00:00:00	2026-10-23 00:00:00	3000.00	cmrehsgjt0000myqyllxe5i28	2026-07-23 00:16:04.137	gym_default_0000000001	0.00	\N	\N
cmrwrklx70024w9q07993b18h	cmrwrklu40022w9q01xu0hyzp	cmrei8j2k0002sv6s0l2814op	2026-07-23 00:00:00	2027-01-23 00:00:00	6000.00	cmrehsgjt0000myqyllxe5i28	2026-07-23 00:19:21.691	gym_default_0000000001	0.00	\N	\N
cmrwsjlw7000sxxl43jnmkyzw	cmrwsjlta000qxxl41kqvmt07	cmrei5w0i0001sv6sg19ty7qy	2026-07-23 00:00:00	2026-10-23 00:00:00	3000.00	cmrehsgjt0000myqyllxe5i28	2026-07-23 00:46:34.594	gym_default_0000000001	0.00	\N	\N
cmrwwlw60002oxxl47fyxqjpr	cmrwwlvzf002mxxl4oy9tz74s	cmrei8zsq0003sv6sb4h7srma	2026-07-23 00:00:00	2027-07-23 00:00:00	10000.00	cmrehsgjt0000myqyllxe5i28	2026-07-23 02:40:19.338	gym_default_0000000001	0.00	\N	\N
cmrwwoswi003lxxl4xehebq57	cmrwwosr7003jxxl4ux5orodc	cmrei5w0i0001sv6sg19ty7qy	2026-07-23 00:00:00	2026-10-23 00:00:00	3000.00	cmrehsgjt0000myqyllxe5i28	2026-07-23 02:42:35.026	gym_default_0000000001	0.00	\N	\N
cmrwxs40o008bxxl4vaqrkwqf	cmrwxs3v30089xxl433vjuq13	cmrei4o8r0000sv6scinjki50	2026-06-30 00:00:00	2026-07-30 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-07-23 03:13:08.976	gym_default_0000000001	0.00	\N	\N
cmrwxy6pv009gxxl4fkfejhhv	cmrwxy6k6009exxl43b08v7py	cmrei4o8r0000sv6scinjki50	2026-06-28 00:00:00	2026-07-28 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-07-23 03:17:52.542	gym_default_0000000001	0.00	\N	\N
cmry5pq3e00114dutxe1ms3f9	cmry5pppg000z4dutp05ncq2n	cmrei8zsq0003sv6sb4h7srma	2026-04-24 06:30:00	2027-04-24 06:30:00	10000.00	cmrehsgjt0000myqyllxe5i28	2026-07-23 23:43:00.34	gym_default_0000000001	0.00	\N	\N
cmrycyzfk002bw1uc8plls80j	cmrycyz720029w1uc23bx75p3	cmrei8j2k0002sv6s0l2814op	2026-07-24 06:30:00	2027-01-24 06:30:00	6000.00	cmrehsgjt0000myqyllxe5i28	2026-07-24 03:06:09.761	gym_default_0000000001	0.00	\N	\N
cms05q36v009kvml9nfb8nhq9	cms05q33f009ivml9n2taiu6e	cmrei4o8r0000sv6scinjki50	2026-06-24 00:00:00	2026-07-24 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-07-25 09:18:49.358	gym_default_0000000001	0.00	\N	\N
cms0ahbtm000swyw7oanqwklt	cms0ahbno000qwyw704183jkz	cmrei8zsq0003sv6sb4h7srma	2026-06-26 00:00:00	2027-06-26 00:00:00	10000.00	cmrehsgjt0000myqyllxe5i28	2026-07-25 11:31:59.47	gym_default_0000000001	0.00	\N	\N
cmrss9ufb000fryv5pk0sheow	cmrss9uc8000dryv5ffn1bdnu	cmrei4o8r0000sv6scinjki50	2026-07-20 00:00:00	2026-08-20 00:00:00	1500.00	\N	2026-07-20 05:27:54.376	gym_default_0000000001	0.00	\N	\N
cmrssofek000tryv5c163elwx	cmrssofbd000rryv5n7n8t5ud	cmrei4o8r0000sv6scinjki50	2026-07-20 00:00:00	2026-08-20 00:00:00	1500.00	\N	2026-07-20 05:39:14.715	gym_default_0000000001	0.00	\N	\N
cmrsspkd6000wryv510o90mwu	cmrssofbd000rryv5n7n8t5ud	cmrei4o8r0000sv6scinjki50	2026-08-20 00:00:00	2026-09-20 00:00:00	1500.00	\N	2026-07-20 05:40:08.033	gym_default_0000000001	0.00	\N	\N
cmrsutyvn001qryv5tc0c4lel	cmrsutyq6001oryv5e479a658	cmrei4o8r0000sv6scinjki50	2026-07-20 00:00:00	2026-08-20 00:00:00	1500.00	\N	2026-07-20 06:39:32.211	gym_default_0000000001	0.00	\N	\N
cms11vlb3001a2xt05znzfg5g	cms11vl5k00182xt0pwwhelmi	cmrei8j2k0002sv6s0l2814op	2026-07-26 00:00:00	2027-01-26 00:00:00	6000.00	cmrehsgjt0000myqyllxe5i28	2026-07-26 00:18:54.441	gym_default_0000000001	0.00	\N	\N
cms202ap0002affa8d57828vf	cms202ako0028ffa8m2pppgru	cmrei4o8r0000sv6scinjki50	2026-07-26 00:00:00	2026-08-26 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-07-26 16:15:54.274	gym_default_0000000001	0.00	\N	\N
cms20d9f40042ffa8li62zy8z	cms20d99l0040ffa86gqfd9vw	cmrei4o8r0000sv6scinjki50	2026-07-26 00:00:00	2026-08-26 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-07-26 16:24:25.424	gym_default_0000000001	0.00	\N	\N
cms217t9m000ou5zuk28929og	cms217t3h000mu5zuyf0fo3om	cmrei8zsq0003sv6sb4h7srma	2026-07-26 00:00:00	2027-07-26 00:00:00	10000.00	cmrehsgjt0000myqyllxe5i28	2026-07-26 16:48:11.182	gym_default_0000000001	0.00	\N	\N
cms2sauys00147gvbvigcyttq	cms2sautz00127gvbo49pxm2q	cmrei8zsq0003sv6sb4h7srma	2026-07-29 00:00:00	2027-07-29 00:00:00	10000.00	cmrehsgjt0000myqyllxe5i28	2026-07-27 05:26:23.095	gym_default_0000000001	0.00	\N	\N
cms2uaoc900177s7pvikx99p0	cms2uao9200157s7p131k9g6m	cmrei5w0i0001sv6sg19ty7qy	2026-07-27 00:00:00	2026-10-27 00:00:00	3000.00	cmrehsgjt0000myqyllxe5i28	2026-07-27 06:22:14.006	gym_default_0000000001	0.00	\N	\N
cms2wdia3004j7s7pmg5j5oa3	cms2wdhn8004h7s7pvtmllr5r	cmrgj1hkf00076738xa8li0ue	2026-06-24 00:00:00	2026-07-24 00:00:00	1000.00	cmrgigyil00036738gu2u4ohv	2026-07-27 07:20:23.162	cmrgigyeg00016738y7zlessn	0.00	\N	\N
cmsb7m8dy00293ebuzsyyjm2m	cmsb7m8ag00273ebuytiqoddx	cmrei8zsq0003sv6sb4h7srma	2026-08-02 00:00:00	2027-08-02 00:00:00	10000.00	cmrehsgjt0000myqyllxe5i28	2026-08-02 02:57:17.579	gym_default_0000000001	0.00	\N	\N
cmsb8454t003d3ebu6exqv9xj	cmsb8451n003b3ebuwqt4j1x9	cmrei8zsq0003sv6sb4h7srma	2026-05-14 00:00:00	2027-05-14 00:00:00	10000.00	cmrehsgjt0000myqyllxe5i28	2026-08-02 03:11:13.265	gym_default_0000000001	0.00	\N	\N
cmsbj92kl006w3ebulohfcklk	cmsbj92gj006u3ebuqd79k6rz	cmrei8zsq0003sv6sb4h7srma	2026-05-13 00:00:00	2027-05-13 00:00:00	10000.00	cmrehsgjt0000myqyllxe5i28	2026-08-02 08:22:58.847	gym_default_0000000001	0.00	\N	\N
cmsmy1rz4000btl0byoh1kcl2	cmsmy1rof0009tl0boeqzc53o	cmrei4o8r0000sv6scinjki50	2026-08-10 00:00:00	2026-09-10 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-08-10 08:02:39.732	gym_default_0000000001	0.00	\N	\N
cmsnb0ybd000txdi34g3i2m5d	cmsnb0y0t000rxdi3tvelynho	cmrei5w0i0001sv6sg19ty7qy	2026-08-10 14:05:53.706	2026-11-10 14:05:53.706	3000.00	cmrehsgjt0000myqyllxe5i28	2026-08-10 14:05:56.311	gym_default_0000000001	0.00	\N	\N
cmspdspam002hyi3yw2f4mvz3	cmspdsoon002fyi3y5t1z938j	cmrei4o8r0000sv6scinjki50	2026-07-18 00:00:00	2026-08-18 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-08-12 00:59:02.623	gym_default_0000000001	0.00	\N	\N
cmspolieg000nol7gabhaddlh	cmspoli3x000lol7gv1cxra97	cmrei5w0i0001sv6sg19ty7qy	2026-08-12 06:01:21.89	2026-11-12 06:01:21.89	3000.00	cmrehsgjt0000myqyllxe5i28	2026-08-12 06:01:23.38	gym_default_0000000001	0.00	\N	\N
cmspzjshj000heecefso1ptfb	cmrwxy6k6009exxl43b08v7py	cmrei4o8r0000sv6scinjki50	2026-08-12 11:07:59.676	2026-09-12 11:07:59.676	1500.00	cmrehsgjt0000myqyllxe5i28	2026-08-12 11:07:59.677	gym_default_0000000001	0.00	\N	\N
cmst3ndih0025powl02bw2zix	cmst3mzwo001upowli9ofbx96	cmrei4o8r0000sv6scinjki50	2026-08-14 15:26:04.034	2026-09-14 15:26:04.034	1500.00	cmrehsgjt0000myqyllxe5i28	2026-08-14 15:26:04.031	gym_default_0000000001	0.00	\N	\N
cmst3n001001wpowluww8x02v	cmst3mzwo001upowli9ofbx96	cmrei4o8r0000sv6scinjki50	2026-07-10 00:00:00	2026-08-10 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-08-14 15:25:46.261	gym_default_0000000001	500.00	2026-08-14 15:30:19.873	cmrehsgjt0000myqyllxe5i28
cmstu3lx20023pdurdkwunxze	cmstu3ltc0021pdur4hz0ptkx	cmrei4o8r0000sv6scinjki50	2026-07-08 00:00:00	2026-08-08 00:00:00	1500.00	cmrehsgjt0000myqyllxe5i28	2026-08-15 03:46:31.118	gym_default_0000000001	0.00	\N	\N
cmstu5r2v002mpdur2rgllgil	cmstu3ltc0021pdur4hz0ptkx	cmrei4o8r0000sv6scinjki50	2026-08-15 03:48:11.373	2026-09-15 03:48:11.373	1500.00	cmrehsgjt0000myqyllxe5i28	2026-08-15 03:48:11.374	gym_default_0000000001	0.00	\N	\N
cmswmsy7f000dohx57tt2mu82	cmswmsxwr000bohx5beujogmq	cmrei5w0i0001sv6sg19ty7qy	2026-01-16 00:00:00	2026-04-16 00:00:00	3000.00	cmrehsgjt0000myqyllxe5i28	2026-08-17 02:45:34.442	gym_default_0000000001	0.00	\N	\N
cmswmz85t000boh27s1j1khhb	cmswmsxwr000bohx5beujogmq	cmrei4o8r0000sv6scinjki50	2026-08-17 02:50:28.053	2026-09-17 02:50:28.053	1500.00	cmrehsgjt0000myqyllxe5i28	2026-08-17 02:50:28.054	gym_default_0000000001	0.00	\N	\N
\.


--
-- TOC entry 4492 (class 0 OID 17639)
-- Dependencies: 277
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, name, email, "passwordHash", role, "createdAt", "updatedAt", "gymId") FROM stdin;
cms0galpz000k378clkv15hgo	Rock2	amudhinimangai880@gmail.com	$2a$10$vmZZVPAcPv/WZm7QBwSh0uLwE.EQXzCdo37SVTJrPmWlYl8W9ADbC	ADMIN	2026-07-25 14:14:43.828	2026-08-02 10:22:14.776	gym_default_0000000001
cmrghelno0001rfn9qyjk6yhe	Platform Admin	admin@platform.test	$2a$10$nUbmq7E/RMXuxbdoWCafaOUukk/uisCbg4BmBR8FAusEUu.Yg1M2G	SUPER_ADMIN	2026-07-11 14:50:26.719	2026-07-11 14:50:26.719	\N
cmrgigyil00036738gu2u4ohv	sre	sre29@gmail.com	$2a$10$cDZM7.TyBkRgJ4O9sDntHeVooL.DSo6aTFzgU5REeQkEUZ7Ot5DaS	OWNER	2026-07-11 15:20:16.035	2026-07-11 15:20:16.035	cmrgigyeg00016738y7zlessn
cms12ajzp005d2xt0i484mtbs	Sam	sam@gmail.com	$2a$10$qUwAeRUopEM1Lu4BtZH.tefNIiozWyBY1ks2KvCP3b.VOVm495g4u	STAFF	2026-07-26 00:30:33.047	2026-08-02 10:22:18.36	gym_default_0000000001
cmsg3zags000l10lvtsqx5wsk	me	me123@gamil.com	$2a$10$rhUpXtS3MKFxTiKtjw4faOw80PiSkLAw6qC5UEY2Jr63xy1UP98z2	STAFF	2026-08-05 13:14:19.243	2026-08-08 02:28:37.19	gym_default_0000000001
cmrvc16110023iyq92n6qwq0s	Rajesh	geekypeople001@gmail.com	$2a$10$LgGgiMc9fWNfag0V.FONfOH0dbUeuq/VfR1X/8Rb779HBv/NEo1pe	OWNER	2026-07-22 00:16:33.789	2026-07-22 00:16:33.789	cmrvc15vc0021iyq9nl17a2os
cmrvd8wnj0011g8obl9eu9iej	Lil	lil26@gamil.com	$2a$10$SYwZNFF1JUyqe/dieaPXs.yG7X1.7nvSlZ8sUJTESNy20H1XfsJpi	OWNER	2026-07-22 00:50:34.841	2026-07-22 00:50:34.841	cmrvd8wgq000zg8ob0bkkpzjq
cmrw6a0yb000ikbquxibx9990	Sara GYM	sara@gmail.com	$2a$10$hnH36D208BX0RbYeONR7vubUuJkknd3mrNbJGSIh3THbrcYIs97oi	OWNER	2026-07-22 14:23:15.842	2026-07-22 14:23:15.842	cmrw6a0sl000gkbqusagk51w3
cmrw7q3hh002hkbquy2byi0hc	HI	hi@gmail.com	$2a$10$Yhz7PuxbLIAV/cnaHHrRj.xLvYzGgh3uunXvG8AxH3Q9nl7dhSKvK	OWNER	2026-07-22 15:03:45.277	2026-07-22 15:03:45.277	cmrw7q3ce002fkbquny9zw333
cmrehsgjt0000myqyllxe5i28	Dom	owner@gym.test	$2a$10$Uv3M31pUUiNKCDQxYNWrC.wZr8NbXLncUKpUoU05zS0FgzmC4OThC	OWNER	2026-07-10 05:25:40.937	2026-07-23 00:01:28.127	gym_default_0000000001
\.


--
-- TOC entry 4501 (class 0 OID 19722)
-- Dependencies: 286
-- Data for Name: Visitor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Visitor" (id, "gymId", name, phone, "visitDate", notes, "createdAt", "updatedAt", status, email, gender, source, "membershipPolicyAgreedText", "membershipPolicyAgreedAt", "fitnessGoal", "ageYears", "heightCm", "weightKg") FROM stdin;
cms1uwwmq000w143r1lsg0g9h	gym_default_0000000001	Jon s	9361527197	2026-07-26	looking for gym	2026-07-26 13:51:45.161	2026-07-26 13:51:45.161	pending	\N	\N	walk_in	\N	\N	\N	\N	\N	\N
cms216oz50006u5zutrvci4sj	gym_default_0000000001	Sre varshan 2.0	9361527197	2026-07-26	\N	2026-07-26 16:47:19.078	2026-07-26 16:48:11.182	converted	\N	\N	walk_in	\N	\N	\N	\N	\N	\N
cms2s9kjo000n7gvb3uat8lep	gym_default_0000000001	Tyla	9361527196	2026-07-27	It's Tyla	2026-07-27 05:25:23.374	2026-07-27 05:26:23.095	converted	\N	\N	walk_in	\N	\N	\N	\N	\N	\N
cms2u8mt900097s7pdm3b33ib	gym_default_0000000001	Travis Scott	9361527197	2026-07-26	Self-registered via QR	2026-07-27 06:20:38.958	2026-07-27 06:22:14.006	converted	\N	MALE	qr_registration	\N	\N	\N	\N	\N	\N
cms2w9kja00437s7p95vgdlw4	cmrgigyeg00016738y7zlessn	PR	8778492304	2026-07-26	Self-registered via QR	2026-07-27 07:17:21.686	2026-07-27 07:20:23.162	converted	\N	MALE	qr_registration	\N	\N	\N	\N	\N	\N
cms2zivdj00bx7s7pqpusdqzc	cmrgigyeg00016738y7zlessn	kevin	456667774	2026-07-26	Self-registered via QR	2026-07-27 08:48:34.611	2026-07-27 08:48:34.611	pending	\N	MALE	qr_registration	\N	\N	\N	\N	\N	\N
cms3081tg000hbqiemznu2ghb	gym_default_0000000001	bro	1234567890	2026-07-26	Self-registered via QR	2026-07-27 09:08:09.275	2026-07-27 09:08:09.275	pending	\N	MALE	qr_registration	\N	\N	\N	\N	\N	\N
cmsmh37ji001d1310rgvbv6vj	gym_default_0000000001	Rohit	546372829	2026-08-10	Self-registered via QR	2026-08-10 00:07:53.489	2026-08-10 00:07:53.489	pending	rohit@gmail.com	MALE	qr_registration	By joining this gym, I acknowledge and agree to the following:\r\n\r\n- I confirm I am physically fit to participate in gym activities, and I will consult a physician regarding my appropriate exercise regime if needed.\r\n- I understand the gym facilities carry inherent risks, and I will test and satisfy myself about the safety of any equipment before use.\r\n- I release the gym, its management, and staff from any claims, costs, or damages related to injury, loss, or damage arising from my use of the facilities, to the extent permitted by law.\r\n- Membership is non-transferable and for my exclusive use only.\r\n- I will wear appropriate sports attire and non-marking shoes, use a towel during workouts, and follow gym staff instructions.\r\n- Outside food, drinks, and smoking are not permitted on the premises.\r\n- The gym is not responsible for personal belongings; I will use lockers provided.\r\n- Management reserves the right to ask any member to leave for violating these rules.	2026-08-10 00:07:53.488	\N	\N	\N	\N
cmsmyeb8z001atl0b0g4io7zk	gym_default_0000000001	Ajith	87373773737	2026-08-10	Self-registered via QR	2026-08-10 08:12:24.985	2026-08-10 08:12:24.985	pending	ajith@gmail.com	MALE	qr_registration	By joining this gym, I acknowledge and agree to the following:\r\n\r\n- I confirm I am physically fit to participate in gym activities, and I will consult a physician regarding my appropriate exercise regime if needed.\r\n- I understand the gym facilities carry inherent risks, and I will test and satisfy myself about the safety of any equipment before use.\r\n- I release the gym, its management, and staff from any claims, costs, or damages related to injury, loss, or damage arising from my use of the facilities, to the extent permitted by law.\r\n- Membership is non-transferable and for my exclusive use only.\r\n- I will wear appropriate sports attire and non-marking shoes, use a towel during workouts, and follow gym staff instructions.\r\n- Outside food, drinks, and smoking are not permitted on the premises.\r\n- The gym is not responsible for personal belongings; I will use lockers provided.\r\n- Management reserves the right to ask any member to leave for violating these rules.	2026-08-10 08:12:24.984	MUSCLE_GAIN	23	180	60.0
cmsnaw68c000fm9qpmtmeqqda	gym_default_0000000001	Ganesh	90037 49530	2026-08-10	Self-registered via QR	2026-08-10 14:02:13.668	2026-08-10 14:05:56.311	converted	poisonhawk622@gmail.com	MALE	qr_registration	By joining this gym, I acknowledge and agree to the following:\r\n\r\n- I confirm I am physically fit to participate in gym activities, and I will consult a physician regarding my appropriate exercise regime if needed.\r\n- I understand the gym facilities carry inherent risks, and I will test and satisfy myself about the safety of any equipment before use.\r\n- I release the gym, its management, and staff from any claims, costs, or damages related to injury, loss, or damage arising from my use of the facilities, to the extent permitted by law.\r\n- Membership is non-transferable and for my exclusive use only.\r\n- I will wear appropriate sports attire and non-marking shoes, use a towel during workouts, and follow gym staff instructions.\r\n- Outside food, drinks, and smoking are not permitted on the premises.\r\n- The gym is not responsible for personal belongings; I will use lockers provided.\r\n- Management reserves the right to ask any member to leave for violating these rules.	2026-08-10 14:02:13.667	STRENGTH_TRAINING	22	195	53.0
cmsn1dcz9000712o9ho190vea	gym_default_0000000001	Steve	8778492305	2026-08-10	Self-registered via QR	2026-08-10 09:35:39.324	2026-08-12 06:01:23.38	converted	steve@gmail.com	PREFER_NOT_TO_SAY	qr_registration	By joining this gym, I acknowledge and agree to the following:\r\n\r\n- I confirm I am physically fit to participate in gym activities, and I will consult a physician regarding my appropriate exercise regime if needed.\r\n- I understand the gym facilities carry inherent risks, and I will test and satisfy myself about the safety of any equipment before use.\r\n- I release the gym, its management, and staff from any claims, costs, or damages related to injury, loss, or damage arising from my use of the facilities, to the extent permitted by law.\r\n- Membership is non-transferable and for my exclusive use only.\r\n- I will wear appropriate sports attire and non-marking shoes, use a towel during workouts, and follow gym staff instructions.\r\n- Outside food, drinks, and smoking are not permitted on the premises.\r\n- The gym is not responsible for personal belongings; I will use lockers provided.\r\n- Management reserves the right to ask any member to leave for violating these rules.	2026-08-10 09:35:39.322	MUSCLE_GAIN	22	164	48.0
\.


--
-- TOC entry 4503 (class 0 OID 23787)
-- Dependencies: 288
-- Data for Name: WorkoutPlan; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WorkoutPlan" (id, "gymId", "memberId", title, level, "weeklySchedule", "createdAt", "updatedAt", "durationWeeks", "focusGoal") FROM stdin;
cmsn6jezj000410aqp85kfgnz	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	Full Body - 7 week	\N	\N	2026-08-10 12:00:19.958	2026-08-18 16:20:57.513	4	Lose fat, build muscle
\.


--
-- TOC entry 4513 (class 0 OID 30692)
-- Dependencies: 298
-- Data for Name: WorkoutPlanDay; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WorkoutPlanDay" (id, "gymId", "workoutPlanId", label, "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmsyvddor0014u7q0sunvmlio	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	push day	0	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513
cmsyvde4d001bu7q0awb5oxjf	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	pull day	1	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513
cmsyvdeei001hu7q08wzwhaha	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	leg day	2	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513
\.


--
-- TOC entry 4508 (class 0 OID 30547)
-- Dependencies: 293
-- Data for Name: WorkoutPlanExercise; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WorkoutPlanExercise" (id, "gymId", "workoutPlanId", "exerciseId", "customName", "sortOrder", "targetSets", "targetReps", tempo, "restSeconds", "targetWeightKg", "createdAt", "updatedAt", "trackingTypeOverride", "workoutPlanDayId") FROM stdin;
cmsyvddsi0015u7q0164xd70i	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	26159aa0-3562-44c5-ae91-ee84f700caf8	\N	0	4	8-10	5-4-3-2-1	90	15.00	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513	\N	cmsyvddor0014u7q0sunvmlio
cmsyvddsi0016u7q0gq5gltpn	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	1feaeab5-ee69-4b4e-89d8-8c05991a4458	\N	1	3	10-12	\N	90	\N	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513	\N	cmsyvddor0014u7q0sunvmlio
cmsyvddsi0017u7q0am0x0lxg	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	949cf1cb-cd5e-404b-8293-b77e007dad1d	\N	2	3	15-20	\N	45	\N	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513	\N	cmsyvddor0014u7q0sunvmlio
cmsyvddsi0018u7q0ziefg83y	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	8ff7c1ec-c609-4d17-a406-b66c7a29f48f	\N	3	3	12-15	\N	45	\N	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513	\N	cmsyvddor0014u7q0sunvmlio
cmsyvddsi0019u7q0zllvy2vh	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	0d7a6b84-b6f8-4b56-a96a-197d6bffad4e	\N	4	3	12-15	\N	60	\N	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513	\N	cmsyvddor0014u7q0sunvmlio
cmsyvde80001cu7q05psqhz3q	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	33c51345-6d4d-4a7b-b816-619553c46522	\N	0	4	8-10	\N	90	\N	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513	\N	cmsyvde4d001bu7q0awb5oxjf
cmsyvde80001du7q0lgglqyxe	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	7c4ab1ea-5b52-4fe6-a77e-64d32cb4b3ed	\N	1	4	5-6	\N	180	\N	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513	\N	cmsyvde4d001bu7q0awb5oxjf
cmsyvde80001eu7q0bo4ys3k8	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	c3f3969e-897d-4b4a-9809-6bd9ead4fae3	\N	2	3	10-12	\N	75	\N	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513	\N	cmsyvde4d001bu7q0awb5oxjf
cmsyvde80001fu7q0tugd91g1	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	802d9205-9775-48af-a4d9-37f91110cf99	\N	3	3	10-12	\N	60	\N	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513	\N	cmsyvde4d001bu7q0awb5oxjf
cmsyvdei8001iu7q0apdmtc2b	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	8976bc40-d6d6-410b-9e74-21e87cd2b6cc	\N	0	4	15-20	\N	45	\N	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513	\N	cmsyvdeei001hu7q08wzwhaha
cmsyvdei8001ju7q0ucxyzvm7	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	cd9df559-2ef0-49c7-aa16-551ecb914b75	\N	1	3	12-15	\N	60	\N	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513	\N	cmsyvdeei001hu7q08wzwhaha
cmsyvdei8001ku7q0wudwllk7	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	6b50abd9-b175-4b00-9184-55233efe6bea	\N	2	4	10-12	\N	90	\N	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513	\N	cmsyvdeei001hu7q08wzwhaha
cmsyvdei8001lu7q08u5sbzpr	gym_default_0000000001	cmsn6jezj000410aqp85kfgnz	5234b32d-2562-44be-b99e-4cb1bf1ee969	\N	3	3	8-10	5-4-3-2-1	90	13.00	2026-08-18 16:20:57.513	2026-08-18 16:20:57.513	\N	cmsyvdeei001hu7q08wzwhaha
\.


--
-- TOC entry 4509 (class 0 OID 30577)
-- Dependencies: 294
-- Data for Name: WorkoutSession; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WorkoutSession" (id, "gymId", "memberId", "workoutPlanId", status, "startedAt", "completedAt", "durationSeconds", "workoutPlanDayId") FROM stdin;
cmsn6n5r5000c14claen2cozq	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-10 12:03:15.809	2026-08-10 12:13:45.588	630	\N
cmsn71qgv002i10aqxr4bxfsy	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-10 12:14:35.839	2026-08-10 12:15:15.626	40	\N
cmsndtyk5000agrkl6n6cyv7g	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-10 15:24:30.389	2026-08-10 15:25:02.712	32	\N
cmso0sjzr000asp4z6a6i2mf4	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-11 02:07:16.024	2026-08-11 02:07:57.105	41	\N
cmsoilltp0002y2xs3eavssgy	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-11 10:25:44.894	2026-08-11 11:33:41.006	4076	\N
cmsom38ci002820k0vz5lidl0	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-11 12:03:26.083	2026-08-11 18:09:53.496	21987	\N
cmsvk6lah0002zcex89lnji55	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-16 08:44:26.825	2026-08-16 08:46:29.424	123	\N
cmsyvoqtw00023wkteridkw4m	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-18 16:29:48.117	2026-08-18 16:30:57.536	69	cmsyvddor0014u7q0sunvmlio
cmsywnb6j0003dvd1c72vgbf0	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-18 16:56:40.795	2026-08-18 16:57:02.788	22	cmsyvde4d001bu7q0awb5oxjf
cmsywo6ub000gdvd1n2aukhks	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-18 16:57:21.827	2026-08-18 16:57:30.395	9	cmsyvdeei001hu7q08wzwhaha
cmsyyxrkx0002zs8lr3z3f4qs	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-18 18:00:47.841	2026-08-18 18:03:12.243	144	cmsyvddor0014u7q0sunvmlio
cmsyzh8780001uzxb80827ygs	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-18 18:15:55.845	2026-08-18 18:18:34.903	159	cmsyvde4d001bu7q0awb5oxjf
cmszhadvm0003v9hqx6dhqtct	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-19 02:34:29.698	2026-08-19 02:35:23.536	54	cmsyvdeei001hu7q08wzwhaha
cmszhlrxd0003ayjbpaf26rns	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-19 02:43:21.122	2026-08-19 02:45:16.487	115	cmsyvddor0014u7q0sunvmlio
cmszi0f1a000qayjbuin0b1y1	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-19 02:54:44.255	2026-08-19 02:54:56.654	12	cmsyvdeei001hu7q08wzwhaha
cmszi2o2g0014ayjbe0scjmby	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-19 02:56:29.273	2026-08-19 02:56:40.667	11	cmsyvde4d001bu7q0awb5oxjf
cmt059fn10002badvn5f2vtoq	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-19 13:45:36.109	2026-08-19 13:46:07.208	31	cmsyvdeei001hu7q08wzwhaha
cmt05bjux000gbadvuxhz6ozn	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-19 13:47:14.889	2026-08-22 03:43:56.826	223002	cmsyvddor0014u7q0sunvmlio
cmt3u3ssh0006xgo699x65ywg	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-22 03:44:22.145	2026-08-22 03:45:19.048	57	cmsyvde4d001bu7q0awb5oxjf
cmtbhmzh80001mrz3zvn9dewl	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-27 12:17:31.676	2026-08-27 12:18:30.471	59	cmsyvdeei001hu7q08wzwhaha
cmtbhpqki000jmrz3q505yp0p	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-27 12:19:40.098	2026-08-27 12:19:59.051	19	cmsyvdeei001hu7q08wzwhaha
cmtbnjxvc0003inlgyqwtdsoq	gym_default_0000000001	cms2sautz00127gvbo49pxm2q	cmsn6jezj000410aqp85kfgnz	COMPLETED	2026-08-27 15:03:07.32	2026-08-27 15:10:05.812	418	cmsyvddor0014u7q0sunvmlio
\.


--
-- TOC entry 4510 (class 0 OID 30593)
-- Dependencies: 295
-- Data for Name: WorkoutSessionExercise; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WorkoutSessionExercise" (id, "gymId", "workoutSessionId", "workoutPlanExerciseId", "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmsyvoqtw00043wkt7vkedis2	gym_default_0000000001	cmsyvoqtw00023wkteridkw4m	cmsyvddsi0015u7q0164xd70i	0	2026-08-18 16:29:48.117	2026-08-18 16:29:48.117
cmsyvoqtw00053wktaft0hh5q	gym_default_0000000001	cmsyvoqtw00023wkteridkw4m	cmsyvddsi0016u7q0gq5gltpn	1	2026-08-18 16:29:48.117	2026-08-18 16:29:48.117
cmsyvoqtx00063wktvpp7p65j	gym_default_0000000001	cmsyvoqtw00023wkteridkw4m	cmsyvddsi0017u7q0am0x0lxg	2	2026-08-18 16:29:48.117	2026-08-18 16:29:48.117
cmsyvoqtx00073wkt1a9euddr	gym_default_0000000001	cmsyvoqtw00023wkteridkw4m	cmsyvddsi0018u7q0ziefg83y	3	2026-08-18 16:29:48.117	2026-08-18 16:29:48.117
cmsyvoqtx00083wktl6ar1rpd	gym_default_0000000001	cmsyvoqtw00023wkteridkw4m	cmsyvddsi0019u7q0zllvy2vh	4	2026-08-18 16:29:48.117	2026-08-18 16:29:48.117
cmsywnb6j0005dvd10ek5wigg	gym_default_0000000001	cmsywnb6j0003dvd1c72vgbf0	cmsyvde80001cu7q05psqhz3q	0	2026-08-18 16:56:40.795	2026-08-18 16:56:40.795
cmsywnb6j0006dvd1sy99wfcb	gym_default_0000000001	cmsywnb6j0003dvd1c72vgbf0	cmsyvde80001du7q0lgglqyxe	1	2026-08-18 16:56:40.795	2026-08-18 16:56:40.795
cmsywnb6j0007dvd1e6s9yoac	gym_default_0000000001	cmsywnb6j0003dvd1c72vgbf0	cmsyvde80001eu7q0bo4ys3k8	2	2026-08-18 16:56:40.795	2026-08-18 16:56:40.795
cmsywnb6j0008dvd1k4f15t8h	gym_default_0000000001	cmsywnb6j0003dvd1c72vgbf0	cmsyvde80001fu7q0tugd91g1	3	2026-08-18 16:56:40.795	2026-08-18 16:56:40.795
cmsywo6ub000idvd1xgd7h9fg	gym_default_0000000001	cmsywo6ub000gdvd1n2aukhks	cmsyvdei8001iu7q0apdmtc2b	0	2026-08-18 16:57:21.827	2026-08-18 16:57:21.827
cmsywo6ub000jdvd19lnhisih	gym_default_0000000001	cmsywo6ub000gdvd1n2aukhks	cmsyvdei8001ju7q0ucxyzvm7	1	2026-08-18 16:57:21.827	2026-08-18 16:57:21.827
cmsywo6ub000kdvd1tgkixwsj	gym_default_0000000001	cmsywo6ub000gdvd1n2aukhks	cmsyvdei8001ku7q0wudwllk7	2	2026-08-18 16:57:21.827	2026-08-18 16:57:21.827
cmsywo6ub000ldvd1x0dczx35	gym_default_0000000001	cmsywo6ub000gdvd1n2aukhks	cmsyvdei8001lu7q08u5sbzpr	3	2026-08-18 16:57:21.827	2026-08-18 16:57:21.827
cmsyyxrkx0004zs8l7jnvegtb	gym_default_0000000001	cmsyyxrkx0002zs8lr3z3f4qs	cmsyvddsi0015u7q0164xd70i	0	2026-08-18 18:00:47.841	2026-08-18 18:00:47.841
cmsyyxrkx0005zs8lv2woi33s	gym_default_0000000001	cmsyyxrkx0002zs8lr3z3f4qs	cmsyvddsi0016u7q0gq5gltpn	1	2026-08-18 18:00:47.841	2026-08-18 18:00:47.841
cmsyyxrkx0006zs8li1tu7zyn	gym_default_0000000001	cmsyyxrkx0002zs8lr3z3f4qs	cmsyvddsi0017u7q0am0x0lxg	2	2026-08-18 18:00:47.841	2026-08-18 18:00:47.841
cmsyyxrkx0007zs8lide59oiu	gym_default_0000000001	cmsyyxrkx0002zs8lr3z3f4qs	cmsyvddsi0018u7q0ziefg83y	3	2026-08-18 18:00:47.841	2026-08-18 18:00:47.841
cmsyyxrkx0008zs8l62ks1ewv	gym_default_0000000001	cmsyyxrkx0002zs8lr3z3f4qs	cmsyvddsi0019u7q0zllvy2vh	4	2026-08-18 18:00:47.841	2026-08-18 18:00:47.841
cmsyzh8780003uzxb5jmz75c1	gym_default_0000000001	cmsyzh8780001uzxb80827ygs	cmsyvde80001cu7q05psqhz3q	0	2026-08-18 18:15:55.845	2026-08-18 18:15:55.845
cmsyzh8780004uzxbzy1s8a3h	gym_default_0000000001	cmsyzh8780001uzxb80827ygs	cmsyvde80001du7q0lgglqyxe	1	2026-08-18 18:15:55.845	2026-08-18 18:15:55.845
cmsyzh8780005uzxb5t8mm70h	gym_default_0000000001	cmsyzh8780001uzxb80827ygs	cmsyvde80001eu7q0bo4ys3k8	2	2026-08-18 18:15:55.845	2026-08-18 18:15:55.845
cmsyzh8780006uzxblnqomk3j	gym_default_0000000001	cmsyzh8780001uzxb80827ygs	cmsyvde80001fu7q0tugd91g1	3	2026-08-18 18:15:55.845	2026-08-18 18:15:55.845
cmszhadvm0005v9hq6gf4ah2u	gym_default_0000000001	cmszhadvm0003v9hqx6dhqtct	cmsyvdei8001iu7q0apdmtc2b	0	2026-08-19 02:34:29.698	2026-08-19 02:34:29.698
cmszhadvm0006v9hqhje63lt9	gym_default_0000000001	cmszhadvm0003v9hqx6dhqtct	cmsyvdei8001ju7q0ucxyzvm7	1	2026-08-19 02:34:29.698	2026-08-19 02:34:29.698
cmszhadvm0007v9hq0him2krq	gym_default_0000000001	cmszhadvm0003v9hqx6dhqtct	cmsyvdei8001ku7q0wudwllk7	2	2026-08-19 02:34:29.698	2026-08-19 02:34:29.698
cmszhadvm0008v9hqy4hkjkcc	gym_default_0000000001	cmszhadvm0003v9hqx6dhqtct	cmsyvdei8001lu7q08u5sbzpr	3	2026-08-19 02:34:29.698	2026-08-19 02:34:29.698
cmszhlrxd0005ayjb1upm9qsg	gym_default_0000000001	cmszhlrxd0003ayjbpaf26rns	cmsyvddsi0015u7q0164xd70i	0	2026-08-19 02:43:21.122	2026-08-19 02:43:21.122
cmszhlrxd0006ayjb13hdgxhe	gym_default_0000000001	cmszhlrxd0003ayjbpaf26rns	cmsyvddsi0016u7q0gq5gltpn	1	2026-08-19 02:43:21.122	2026-08-19 02:43:21.122
cmszhlrxd0007ayjbngykpud5	gym_default_0000000001	cmszhlrxd0003ayjbpaf26rns	cmsyvddsi0017u7q0am0x0lxg	2	2026-08-19 02:43:21.122	2026-08-19 02:43:21.122
cmszhlrxd0008ayjbpeildlvp	gym_default_0000000001	cmszhlrxd0003ayjbpaf26rns	cmsyvddsi0018u7q0ziefg83y	3	2026-08-19 02:43:21.122	2026-08-19 02:43:21.122
cmszhlrxd0009ayjbiqw9j9em	gym_default_0000000001	cmszhlrxd0003ayjbpaf26rns	cmsyvddsi0019u7q0zllvy2vh	4	2026-08-19 02:43:21.122	2026-08-19 02:43:21.122
cmszi0f1b000sayjbdvirkvwi	gym_default_0000000001	cmszi0f1a000qayjbuin0b1y1	cmsyvdei8001iu7q0apdmtc2b	0	2026-08-19 02:54:44.255	2026-08-19 02:54:44.255
cmszi0f1b000tayjbxrr16jwy	gym_default_0000000001	cmszi0f1a000qayjbuin0b1y1	cmsyvdei8001ju7q0ucxyzvm7	1	2026-08-19 02:54:44.255	2026-08-19 02:54:44.255
cmszi0f1b000uayjbjwzl2tfm	gym_default_0000000001	cmszi0f1a000qayjbuin0b1y1	cmsyvdei8001ku7q0wudwllk7	2	2026-08-19 02:54:44.255	2026-08-19 02:54:44.255
cmszi0f1b000vayjbgdgp9yc8	gym_default_0000000001	cmszi0f1a000qayjbuin0b1y1	cmsyvdei8001lu7q08u5sbzpr	3	2026-08-19 02:54:44.255	2026-08-19 02:54:44.255
cmszi2o2g0016ayjb0j8oorsx	gym_default_0000000001	cmszi2o2g0014ayjbe0scjmby	cmsyvde80001cu7q05psqhz3q	0	2026-08-19 02:56:29.273	2026-08-19 02:56:29.273
cmszi2o2g0017ayjb39rxqq03	gym_default_0000000001	cmszi2o2g0014ayjbe0scjmby	cmsyvde80001du7q0lgglqyxe	1	2026-08-19 02:56:29.273	2026-08-19 02:56:29.273
cmszi2o2g0018ayjb1gkryhn3	gym_default_0000000001	cmszi2o2g0014ayjbe0scjmby	cmsyvde80001eu7q0bo4ys3k8	2	2026-08-19 02:56:29.273	2026-08-19 02:56:29.273
cmszi2o2g0019ayjbbp9d9bpb	gym_default_0000000001	cmszi2o2g0014ayjbe0scjmby	cmsyvde80001fu7q0tugd91g1	3	2026-08-19 02:56:29.273	2026-08-19 02:56:29.273
cmt059fn10004badvxo77hw6i	gym_default_0000000001	cmt059fn10002badvn5f2vtoq	cmsyvdei8001iu7q0apdmtc2b	0	2026-08-19 13:45:36.109	2026-08-19 13:45:36.109
cmt059fn10005badv5jbdw5o5	gym_default_0000000001	cmt059fn10002badvn5f2vtoq	cmsyvdei8001ju7q0ucxyzvm7	1	2026-08-19 13:45:36.109	2026-08-19 13:45:36.109
cmt059fn10006badvg6t5tjyg	gym_default_0000000001	cmt059fn10002badvn5f2vtoq	cmsyvdei8001ku7q0wudwllk7	2	2026-08-19 13:45:36.109	2026-08-19 13:45:36.109
cmt059fn10007badv6fjgo2cw	gym_default_0000000001	cmt059fn10002badvn5f2vtoq	cmsyvdei8001lu7q08u5sbzpr	3	2026-08-19 13:45:36.109	2026-08-19 13:45:36.109
cmt05bjux000ibadv8sfyyu5s	gym_default_0000000001	cmt05bjux000gbadvuxhz6ozn	cmsyvddsi0015u7q0164xd70i	0	2026-08-19 13:47:14.889	2026-08-19 13:47:14.889
cmt05bjux000jbadvwcwci8hu	gym_default_0000000001	cmt05bjux000gbadvuxhz6ozn	cmsyvddsi0016u7q0gq5gltpn	1	2026-08-19 13:47:14.889	2026-08-19 13:47:14.889
cmt05bjux000kbadv5f3h0lck	gym_default_0000000001	cmt05bjux000gbadvuxhz6ozn	cmsyvddsi0017u7q0am0x0lxg	2	2026-08-19 13:47:14.889	2026-08-19 13:47:14.889
cmt05bjux000lbadvyjwv9730	gym_default_0000000001	cmt05bjux000gbadvuxhz6ozn	cmsyvddsi0018u7q0ziefg83y	3	2026-08-19 13:47:14.889	2026-08-19 13:47:14.889
cmt05bjux000mbadv9jtiustp	gym_default_0000000001	cmt05bjux000gbadvuxhz6ozn	cmsyvddsi0019u7q0zllvy2vh	4	2026-08-19 13:47:14.889	2026-08-19 13:47:14.889
cmt3u3ssh0008xgo6jhq4vcc5	gym_default_0000000001	cmt3u3ssh0006xgo699x65ywg	cmsyvde80001cu7q05psqhz3q	0	2026-08-22 03:44:22.145	2026-08-22 03:44:22.145
cmt3u3ssh0009xgo6sp1hmcvm	gym_default_0000000001	cmt3u3ssh0006xgo699x65ywg	cmsyvde80001du7q0lgglqyxe	1	2026-08-22 03:44:22.145	2026-08-22 03:44:22.145
cmt3u3ssh000axgo6n1igkp9o	gym_default_0000000001	cmt3u3ssh0006xgo699x65ywg	cmsyvde80001eu7q0bo4ys3k8	2	2026-08-22 03:44:22.145	2026-08-22 03:44:22.145
cmt3u3ssh000bxgo6jqdreqvs	gym_default_0000000001	cmt3u3ssh0006xgo699x65ywg	cmsyvde80001fu7q0tugd91g1	3	2026-08-22 03:44:22.145	2026-08-22 03:44:22.145
cmtbhmzh80003mrz3p2t32yfl	gym_default_0000000001	cmtbhmzh80001mrz3zvn9dewl	cmsyvdei8001iu7q0apdmtc2b	0	2026-08-27 12:17:31.676	2026-08-27 12:17:31.676
cmtbhmzh80004mrz31py35nkk	gym_default_0000000001	cmtbhmzh80001mrz3zvn9dewl	cmsyvdei8001ju7q0ucxyzvm7	1	2026-08-27 12:17:31.676	2026-08-27 12:17:31.676
cmtbhmzh80005mrz3vz756o16	gym_default_0000000001	cmtbhmzh80001mrz3zvn9dewl	cmsyvdei8001ku7q0wudwllk7	2	2026-08-27 12:17:31.676	2026-08-27 12:17:31.676
cmtbhmzh80006mrz35murg0pp	gym_default_0000000001	cmtbhmzh80001mrz3zvn9dewl	cmsyvdei8001lu7q08u5sbzpr	3	2026-08-27 12:17:31.676	2026-08-27 12:17:31.676
cmtbhpqki000lmrz3swu8fv8d	gym_default_0000000001	cmtbhpqki000jmrz3q505yp0p	cmsyvdei8001iu7q0apdmtc2b	0	2026-08-27 12:19:40.098	2026-08-27 12:19:40.098
cmtbhpqki000mmrz3ae11jf4k	gym_default_0000000001	cmtbhpqki000jmrz3q505yp0p	cmsyvdei8001ju7q0ucxyzvm7	1	2026-08-27 12:19:40.098	2026-08-27 12:19:40.098
cmtbhpqki000nmrz3p4tgd70b	gym_default_0000000001	cmtbhpqki000jmrz3q505yp0p	cmsyvdei8001ku7q0wudwllk7	2	2026-08-27 12:19:40.098	2026-08-27 12:19:40.098
cmtbhpqki000omrz34smv16e1	gym_default_0000000001	cmtbhpqki000jmrz3q505yp0p	cmsyvdei8001lu7q08u5sbzpr	3	2026-08-27 12:19:40.098	2026-08-27 12:19:40.098
cmtbnjxvc0005inlga283li51	gym_default_0000000001	cmtbnjxvc0003inlgyqwtdsoq	cmsyvddsi0015u7q0164xd70i	0	2026-08-27 15:03:07.32	2026-08-27 15:03:07.32
cmtbnjxvc0006inlgz369pwy7	gym_default_0000000001	cmtbnjxvc0003inlgyqwtdsoq	cmsyvddsi0016u7q0gq5gltpn	1	2026-08-27 15:03:07.32	2026-08-27 15:03:07.32
cmtbnjxvc0007inlgegpddkx6	gym_default_0000000001	cmtbnjxvc0003inlgyqwtdsoq	cmsyvddsi0017u7q0am0x0lxg	2	2026-08-27 15:03:07.32	2026-08-27 15:03:07.32
cmtbnjxvc0008inlg8fv4p3wv	gym_default_0000000001	cmtbnjxvc0003inlgyqwtdsoq	cmsyvddsi0018u7q0ziefg83y	3	2026-08-27 15:03:07.32	2026-08-27 15:03:07.32
cmtbnjxvc0009inlgdodvmxbv	gym_default_0000000001	cmtbnjxvc0003inlgyqwtdsoq	cmsyvddsi0019u7q0zllvy2vh	4	2026-08-27 15:03:07.32	2026-08-27 15:03:07.32
\.


--
-- TOC entry 4511 (class 0 OID 30614)
-- Dependencies: 296
-- Data for Name: WorkoutSetLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."WorkoutSetLog" (id, "gymId", "sessionExerciseId", "setNumber", "weightKg", "loggedAt", "durationSeconds") FROM stdin;
cmsyvpmkw000c3wkt1ktdt632	gym_default_0000000001	cmsyvoqtw00043wkt7vkedis2	1	16.00	2026-08-18 16:30:29.264	\N
cmsyvpsdm000g3wktojdq2ckv	gym_default_0000000001	cmsyvoqtw00043wkt7vkedis2	3	19.00	2026-08-18 16:30:36.778	\N
cmsyvq271000k3wkti5b07dt0	gym_default_0000000001	cmsyvoqtw00043wkt7vkedis2	4	34.00	2026-08-18 16:30:49.502	\N
cmsyyyfjy000czs8l40gf49hu	gym_default_0000000001	cmsyyxrkx0004zs8l7jnvegtb	1	16.00	2026-08-18 18:01:18.91	\N
cmsyyyrmc000kzs8l37utpwdy	gym_default_0000000001	cmsyyxrkx0004zs8l7jnvegtb	2	15.00	2026-08-18 18:01:34.548	\N
cmsyyzbq8000ozs8lvqy7m1s4	gym_default_0000000001	cmsyyxrkx0005zs8lv2woi33s	1	8.50	2026-08-18 18:02:00.608	\N
cmsyyzhdr000szs8l7tzwjajq	gym_default_0000000001	cmsyyxrkx0005zs8lv2woi33s	2	9.50	2026-08-18 18:02:07.935	\N
cmsyyznw2000wzs8lp9jj6z1t	gym_default_0000000001	cmsyyxrkx0005zs8lv2woi33s	3	10.50	2026-08-18 18:02:16.37	\N
cmsyz056l0010zs8ltz2gy26j	gym_default_0000000001	cmsyyxrkx0006zs8li1tu7zyn	1	4.50	2026-08-18 18:02:38.781	\N
cmsyz0mvf0014zs8lt7oetaiy	gym_default_0000000001	cmsyyxrkx0006zs8li1tu7zyn	2	5.50	2026-08-18 18:03:01.707	\N
cmsyz0opf0018zs8lgh9cll3u	gym_default_0000000001	cmsyyxrkx0006zs8li1tu7zyn	3	6.00	2026-08-18 18:03:04.083	\N
cmsyzia53000buzxby0rvr3e8	gym_default_0000000001	cmsyzh8780003uzxb5jmz75c1	1	10.00	2026-08-18 18:16:45.015	\N
cmsyzihc8000fuzxbpdtjhykw	gym_default_0000000001	cmsyzh8780003uzxb5jmz75c1	2	15.00	2026-08-18 18:16:52.855	\N
cmsyzis6p000juzxb7jk126n3	gym_default_0000000001	cmsyzh8780003uzxb5jmz75c1	3	20.00	2026-08-18 18:17:08.401	\N
cmsyzj0cx000nuzxbhfcu5jzv	gym_default_0000000001	cmsyzh8780003uzxb5jmz75c1	4	25.00	2026-08-18 18:17:18.993	\N
cmsyzjq4k000suzxbav7382nm	gym_default_0000000001	cmsyzh8780004uzxbzy1s8a3h	1	10.00	2026-08-18 18:17:52.388	\N
cmsyzjz8r000wuzxbua3b3039	gym_default_0000000001	cmsyzh8780004uzxbzy1s8a3h	2	10.00	2026-08-18 18:18:04.203	\N
cmsyzk6fp0010uzxb8unx441q	gym_default_0000000001	cmsyzh8780004uzxbzy1s8a3h	3	10.00	2026-08-18 18:18:13.525	\N
cmsyzkdmq0014uzxb1tpp851p	gym_default_0000000001	cmsyzh8780004uzxbzy1s8a3h	4	15.00	2026-08-18 18:18:21.175	\N
cmszhb11u000ev9hqfolrgltv	gym_default_0000000001	cmszhadvm0005v9hq6gf4ah2u	1	10.00	2026-08-19 02:34:59.545	\N
cmszhmj15000dayjbqjahsm02	gym_default_0000000001	cmszhlrxd0005ayjb1upm9qsg	1	22.50	2026-08-19 02:43:56.249	\N
cmt05c7al000rbadvy8a74pbj	gym_default_0000000001	cmt05bjux000ibadv8sfyyu5s	1	22.50	2026-08-19 13:47:45.262	\N
cmt3u4kh4000gxgo6485n4lfu	gym_default_0000000001	cmt3u3ssh0008xgo6jhq4vcc5	1	10.00	2026-08-22 03:44:58.025	\N
cmt3u4so2000kxgo6yoq4joi3	gym_default_0000000001	cmt3u3ssh0008xgo6jhq4vcc5	2	10.00	2026-08-22 03:45:08.643	\N
cmtbhnvvm000bmrz349uk0lni	gym_default_0000000001	cmtbhmzh80003mrz3p2t32yfl	1	10.00	2026-08-27 12:18:13.666	\N
cmtbnkmc4000finlgnz6tbqbe	gym_default_0000000001	cmtbnjxvc0005inlga283li51	1	22.50	2026-08-27 15:03:39.028	\N
\.


--
-- TOC entry 4491 (class 0 OID 17605)
-- Dependencies: 276
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c7846245-951f-447d-88ff-9af6d5910f5e	86207b3f63df66ceac83fd42bbe3d0c7185de77d5485b2723f980fc38579028a	2026-07-10 05:25:07.462071+00	20260710052506_init	\N	\N	2026-07-10 05:25:06.887344+00	1
93314f12-fafe-4b08-a701-a656ca5d5ef7	2977cdcf70beb82a98bbc16903e1802b4d2b7625f1ceb2ac1d87e39cfd8d4e4f	2026-07-27 05:48:06.9559+00	20260727111500_qr_registration	\N	\N	2026-07-27 05:48:06.644364+00	1
c321c5fb-198d-4aa4-8342-cb05986ed484	19619f36edc62f81cd0c618c194cf1c91569e4d6cbacc80c7638d8e081f39b8c	2026-07-10 06:55:58.820052+00	20260710065558_receipts_and_profile	\N	\N	2026-07-10 06:55:58.524493+00	1
eaab6ae7-f862-4be7-b2c5-a0b397eb8420	5310fc8901b43000d8a7a1fc8c6b72d79033cef524006171ec4f9b5107201f57	2026-07-10 07:07:53.221681+00	20260710070752_receipt_optional_period	\N	\N	2026-07-10 07:07:52.999325+00	1
b69ca586-e6c0-466e-90e7-dcb756e25ddd	cb961fc32b4e714e2669c4050aad79b8b89c3a2dd616ae28252b653567ad4e93	2026-07-11 14:48:48.305349+00	20260711150000_multi_tenant_saas	\N	\N	2026-07-11 14:48:47.546989+00	1
b69393ae-f15f-4cf9-91f4-a2d37fcaceb0	ffc84ebdb0dcdc03a566ae7877b142c8b48132329060ac98c5173b8e846a53ad	2026-07-29 04:30:23.542281+00	20260729100000_programme_plans	\N	\N	2026-07-29 04:30:22.566518+00	1
369a9037-3a33-404e-9f71-88cf5d3ab4e0	d0af7579342af6a915b72e126d8e831a4f64c53ed7d9fcc0e9284cb80b2840b5	2026-07-17 06:14:26.00756+00	20260717101500_receipt_installment_balance	\N	\N	2026-07-17 06:14:25.515685+00	1
96be75bb-30b5-478e-86b7-327b730d26ff	ce26e56435eb223397d57b7651af510dda0fe69943e7cbb21572e8a7c01f5008	2026-07-21 23:57:09.024179+00	20260722100000_enable_rls	\N	\N	2026-07-21 23:57:08.525998+00	1
10dfe38f-3e2e-4b9a-8010-0cdeff672c24	abbe25957e95ef148487d0efa196a82dee8ca33370db47fb66fa678fb4f1d49d	2026-07-22 14:48:28.229917+00	20260722143000_consolidate_gym_select_and_fk_indexes	\N	\N	2026-07-22 14:48:27.770907+00	1
4622ba21-9a07-4a64-88f6-b61c666f7d5a	24769061e768870fa233c0079dc658f4ff39a91437e56e65512391a27a43a64f	2026-07-29 04:31:21.384507+00	20260729100100_programme_plans_member_unique	\N	\N	2026-07-29 04:31:20.243393+00	1
895800a1-b5dd-4db5-a963-831894453c7e	0b4e540f3432da5eabfd7c61b6dbfd24a7c0c13e4878c75b0c347e5776469b1e	2026-07-23 00:06:25.275459+00	20260723100000_member_photo_url	\N	\N	2026-07-23 00:06:25.008103+00	1
a1557e4c-5831-42f9-91b5-9ff0396f4ae9	629c0b534b51f49df55ef3416d47badbca17a21e1da9beea45d1aa941d9eecb9	2026-07-23 00:41:53.755198+00	20260723110000_member_gender	\N	\N	2026-07-23 00:41:53.430361+00	1
c161349d-f9aa-4814-860f-48f644b6a3b4	cf9561cb7d024120f8709ea7ec3d2552834d75fd986fc583d1b5402a53199fee	2026-07-25 14:56:12.611199+00	20260725120000_fix_rls_boolean_gucs	\N	\N	2026-07-25 14:56:12.143544+00	1
82736290-7c1c-48a8-bd41-37d0364a5858	c52e022f8acf99c6bb89afc1ffbe31f2a17dc8f679e3b2edfd6d9047c1d95f0a	2026-08-02 10:59:44.397183+00	20260802105859_employee	\N	\N	2026-08-02 10:59:43.784335+00	1
7f31091b-2a9f-4af2-930e-034b4699684b	5e0f9a5d78851fdd6b3fb82c71de028084eeadc2fdcbf14d10652f2a1ba406c0	2026-07-25 14:56:13.091242+00	20260725183000_member_pt_trainer	\N	\N	2026-07-25 14:56:12.733995+00	1
db3a5a18-efcf-40fd-99ba-af8ea9807a2c	30e9ba16a25dfa38f111a64bc29d1591e975ae49938da617a119d54bd729bd57	2026-07-26 00:45:57.304853+00	20260726061500_visitor	\N	\N	2026-07-26 00:45:56.971648+00	1
504e5c91-6e83-4177-ad2b-6ed71800e0ba	1128af6a0e16b7d4c8ac249efdb85b5296009e8cd41e983fb1d755747df0964f	2026-07-26 16:41:56.475419+00	20260726161000_visitor_status	\N	\N	2026-07-26 16:41:55.899236+00	1
99e50c66-85e3-46de-ba0c-ce83f06d9dea	4a84bf9e332694f8b260884072d6bc2cd52dc5e4af41b124913f50f1c90c2f4e	2026-08-02 23:06:13.937533+00	20260802120000_employee_rls	\N	\N	2026-08-02 23:06:13.557624+00	1
c51e5a19-57d4-490f-8308-6dd66e93fe7a	54e9d263bd3659bd6e8728d16f33a7667123b9e33b5031570f358c633f52719e	2026-08-02 23:07:12.774104+00	20260802230625_gym_event	\N	\N	2026-08-02 23:07:12.333132+00	1
e7fb6e40-188b-4812-bee1-0039fc2d68f9	91cf4e9f9c854cda06016c54385ec5146899d098526f36016b24e6dbe67d5cec	2026-08-03 23:48:02.333297+00	20260804120000_ledger_transaction	\N	\N	2026-08-03 23:48:01.87292+00	1
4fbc9351-a2ed-49a7-a75a-a558d026fdcf	8a6ce1e73bffd0e1ed5690152f2b7839488bf391a879329afaf8e1d2394c4c56	2026-08-06 06:56:22.323901+00	20260806120000_membership_policy	\N	\N	2026-08-06 06:56:21.423229+00	1
a6252824-bbfb-4bb0-bf4a-d44285bc2025	2bc435247ca4d3b173ffc6ca652b0aa409e8957fd782d5e647e22ae085d20615	\N	20260806140000_member_portal	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260806140000_member_portal\n\nDatabase error code: 23505\n\nDatabase error:\nERROR: could not create unique index "Member_gymId_phoneDigits_key"\nDETAIL: Key ("gymId", "phoneDigits")=(gym_default_0000000001, 8778492304) is duplicated.\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E23505), message: "could not create unique index \\"Member_gymId_phoneDigits_key\\"", detail: Some("Key (\\"gymId\\", \\"phoneDigits\\")=(gym_default_0000000001, 8778492304) is duplicated."), hint: None, position: None, where_: None, schema: Some("public"), table: Some("Member"), column: None, datatype: None, constraint: Some("Member_gymId_phoneDigits_key"), file: Some("tuplesortvariants.c"), line: Some(1550), routine: Some("comparetup_index_btree_tiebreak") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260806140000_member_portal"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20260806140000_member_portal"\n             at schema-engine\\core\\src\\commands\\apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:226	2026-08-06 10:23:58.276683+00	2026-08-06 09:09:16.152071+00	0
29d36cb2-d353-4497-a69a-9b5770f3a06c	025ca1de526349672e2c0c24578f291e5b6e7f71d6f0f4f5dc5d9fab0bb5a355	2026-08-06 10:23:58.481292+00	20260806140000_member_portal		\N	2026-08-06 10:23:58.481292+00	0
a822ebd7-29fc-48c2-80ac-d201923c1890	7b4d0858199e9a741e1badcc462b57b1e17a6e07f173aeb6aba77d8186f8da2e	2026-08-18 12:45:56.098361+00	20260818120000_workout_plan_day	\N	\N	2026-08-18 12:45:55.654208+00	1
ba346a4d-4dc0-4d3b-8107-f07509d6918b	00b79f944057af86fec72393823fd1d086cea4e2f44cfdc1bdc4d66bb112bb90	\N	20260806140100_member_portal_phone_index	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260806140100_member_portal_phone_index\n\nDatabase error code: 42703\n\nDatabase error:\nERROR: column "phoneDigits" does not exist\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42703), message: "column \\"phoneDigits\\" does not exist", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("indexcmds.c"), line: Some(1888), routine: Some("ComputeIndexAttrs") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260806140100_member_portal_phone_index"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20260806140100_member_portal_phone_index"\n             at schema-engine\\core\\src\\commands\\apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:226	2026-08-06 23:47:30.088191+00	2026-08-06 23:29:13.86041+00	0
728b42e6-3b0f-464b-a1e9-65deddd9e6f6	00b79f944057af86fec72393823fd1d086cea4e2f44cfdc1bdc4d66bb112bb90	2026-08-06 23:47:30.197638+00	20260806140100_member_portal_phone_index		\N	2026-08-06 23:47:30.197638+00	0
f40d72e3-bad5-44f8-9400-6af85347c043	89c21520eafb394cf5c70546a74eb139b97fd5cd40b42be036750eecea0647cd	2026-08-10 07:46:12.041803+00	20260810130000_fitness_goal	\N	\N	2026-08-10 07:46:10.835826+00	1
ba365a58-e3c3-466b-91d3-80ee4beb2815	c27a05bb19f6c3c2ac6a769e50d8bd04039a9c493de274e7d11e266f36b6fccf	2026-08-10 07:46:10.30285+00	20260808120000_member_portal_google_oauth	\N	\N	2026-08-10 07:46:08.84035+00	1
8d1100b3-26f6-499b-b752-c7b05cd9bd93	40373f20a9bfdab8c130954712d5279efafa9d06d970d8e34f2306077ff51e86	2026-08-10 11:18:36.957191+00	20260810160000_workout_tracking_phase1	\N	\N	2026-08-10 11:18:36.472555+00	1
db5a61bc-3b4d-4be8-955e-b67060c680f4	5e045d18299e76ffbf9bfff1fb5ea1418c2fb264d7cbb85c152baa6a5f778b5e	2026-08-10 11:41:30.425916+00	20260810170000_workout_tracking_phase2	\N	\N	2026-08-10 11:41:29.940274+00	1
2ba58793-d35e-411e-91fc-0d09d5b54be2	cdb912e96d27f3e9807781858d78967b36cc546de3e7433138d4fb10d11fe64b	2026-08-11 11:20:07.87036+00	20260810180000_exercise_tracking_type	\N	\N	2026-08-11 11:20:07.542988+00	1
7d00e140-6b1c-4875-8de4-fc51a191f747	8a5e81db78da220537b415069f232eb44286924b3142aaf5a1332cc411a6adcc	2026-08-14 14:45:18.499079+00	20260814120000_staff_login_throttle	\N	\N	2026-08-14 14:45:18.146058+00	1
1ac4de5e-a2f0-47fa-a03d-041a9fd3fede	78b0edfff4a6c297d133da57615b837a43da3e2ec8b94871b0516535a62ffc40	2026-08-14 14:45:18.898418+00	20260814130000_subscription_write_off	\N	\N	2026-08-14 14:45:18.613041+00	1
\.


--
-- TOC entry 4480 (class 0 OID 17173)
-- Dependencies: 261
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-07-10 02:06:26
20211116045059	2026-07-10 02:06:26
20211116050929	2026-07-10 02:06:26
20211116051442	2026-07-10 02:06:26
20211116212300	2026-07-10 02:06:26
20211116213355	2026-07-10 02:06:26
20211116213934	2026-07-10 02:06:26
20211116214523	2026-07-10 02:06:26
20211122062447	2026-07-10 02:06:26
20211124070109	2026-07-10 02:06:26
20211202204204	2026-07-10 02:06:26
20211202204605	2026-07-10 02:06:26
20211210212804	2026-07-10 02:06:26
20211228014915	2026-07-10 02:06:26
20220107221237	2026-07-10 02:06:26
20220228202821	2026-07-10 02:06:26
20220312004840	2026-07-10 02:06:26
20220603231003	2026-07-10 02:06:26
20220603232444	2026-07-10 02:06:26
20220615214548	2026-07-10 02:06:26
20220712093339	2026-07-10 02:06:26
20220908172859	2026-07-10 02:06:26
20220916233421	2026-07-10 02:06:26
20230119133233	2026-07-10 02:06:26
20230128025114	2026-07-10 02:06:26
20230128025212	2026-07-10 02:06:26
20230227211149	2026-07-10 02:06:26
20230228184745	2026-07-10 02:06:26
20230308225145	2026-07-10 02:06:26
20230328144023	2026-07-10 02:06:26
20231018144023	2026-07-10 02:06:26
20231204144023	2026-07-10 02:06:26
20231204144024	2026-07-10 02:06:26
20231204144025	2026-07-10 02:06:26
20240108234812	2026-07-10 02:06:26
20240109165339	2026-07-10 02:06:26
20240227174441	2026-07-10 02:06:26
20240311171622	2026-07-10 02:06:26
20240321100241	2026-07-10 02:06:26
20240401105812	2026-07-10 02:06:26
20240418121054	2026-07-10 02:06:26
20240523004032	2026-07-10 02:06:26
20240618124746	2026-07-10 02:06:26
20240801235015	2026-07-10 02:06:26
20240805133720	2026-07-10 02:06:26
20240827160934	2026-07-10 02:06:26
20240919163303	2026-07-10 02:06:26
20240919163305	2026-07-10 02:06:26
20241019105805	2026-07-10 02:06:26
20241030150047	2026-07-10 02:06:26
20241108114728	2026-07-10 02:06:26
20241121104152	2026-07-10 02:06:26
20241130184212	2026-07-10 02:06:26
20241220035512	2026-07-10 02:06:26
20241220123912	2026-07-10 02:06:26
20241224161212	2026-07-10 02:06:26
20250107150512	2026-07-10 02:06:26
20250110162412	2026-07-10 02:06:26
20250123174212	2026-07-10 02:06:26
20250128220012	2026-07-10 02:06:26
20250506224012	2026-07-10 02:06:26
20250523164012	2026-07-10 02:06:26
20250714121412	2026-07-10 02:06:26
20250905041441	2026-07-10 02:06:26
20251103001201	2026-07-10 02:06:26
20251120212548	2026-07-10 02:06:26
20251120215549	2026-07-10 02:06:26
20260218120000	2026-07-10 02:06:26
20260326120000	2026-07-10 02:06:27
20260514120000	2026-07-10 02:06:27
20260527120000	2026-07-10 02:06:27
20260528120000	2026-07-10 02:06:27
20260603120000	2026-07-10 02:06:27
20260605120000	2026-07-10 02:06:27
20260606110000	2026-07-10 02:06:27
20260616120000	2026-07-10 02:06:27
20260624120000	2026-07-10 05:20:52
20260626120000	2026-07-10 05:20:52
20260706120000	2026-07-10 05:20:53
20260707120000	2026-07-17 05:04:07
20260709120000	2026-07-17 05:04:07
20260714120000	2026-09-08 08:19:36
\.


--
-- TOC entry 4482 (class 0 OID 17195)
-- Dependencies: 264
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at, action_filter, selected_columns) FROM stdin;
\.


--
-- TOC entry 4484 (class 0 OID 17405)
-- Dependencies: 269
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type, versioning_status) FROM stdin;
gym-assets	gym-assets	\N	2026-07-10 08:15:06.924709+00	2026-07-10 08:15:06.924709+00	t	f	\N	\N	\N	STANDARD	DISABLED
\.


--
-- TOC entry 4488 (class 0 OID 17524)
-- Dependencies: 273
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- TOC entry 4489 (class 0 OID 17537)
-- Dependencies: 274
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4483 (class 0 OID 17397)
-- Dependencies: 268
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-07-10 02:06:31.20463
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-07-10 02:06:31.255878
2	storage-schema	f6a1fa2c93cbcd16d4e487b362e45fca157a8dbd	2026-07-10 02:06:31.264082
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-07-10 02:06:31.317166
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-07-10 02:06:31.351729
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-07-10 02:06:31.357108
6	change-column-name-in-get-size	ded78e2f1b5d7e616117897e6443a925965b30d2	2026-07-10 02:06:31.365596
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-07-10 02:06:31.371975
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-07-10 02:06:31.376817
9	fix-search-function	af597a1b590c70519b464a4ab3be54490712796b	2026-07-10 02:06:31.383002
10	search-files-search-function	b595f05e92f7e91211af1bbfe9c6a13bb3391e16	2026-07-10 02:06:31.387894
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-07-10 02:06:31.39594
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-07-10 02:06:31.402683
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-07-10 02:06:31.41039
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-07-10 02:06:31.418264
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-07-10 02:06:31.609367
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-07-10 02:06:31.621871
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-07-10 02:06:31.625767
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-07-10 02:06:31.62932
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-07-10 02:06:31.635368
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-07-10 02:06:31.639711
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-07-10 02:06:31.646246
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-07-10 02:06:31.675618
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-07-10 02:06:31.691486
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-07-10 02:06:31.695599
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-07-10 02:06:31.699735
26	objects-prefixes	215cabcb7f78121892a5a2037a09fedf9a1ae322	2026-07-10 02:06:31.703899
27	search-v2	859ba38092ac96eb3964d83bf53ccc0b141663a6	2026-07-10 02:06:31.707332
28	object-bucket-name-sorting	c73a2b5b5d4041e39705814fd3a1b95502d38ce4	2026-07-10 02:06:31.71066
29	create-prefixes	ad2c1207f76703d11a9f9007f821620017a66c21	2026-07-10 02:06:31.713902
30	update-object-levels	2be814ff05c8252fdfdc7cfb4b7f5c7e17f0bed6	2026-07-10 02:06:31.71733
31	objects-level-index	b40367c14c3440ec75f19bbce2d71e914ddd3da0	2026-07-10 02:06:31.7205
32	backward-compatible-index-on-objects	e0c37182b0f7aee3efd823298fb3c76f1042c0f7	2026-07-10 02:06:31.723738
33	backward-compatible-index-on-prefixes	b480e99ed951e0900f033ec4eb34b5bdcb4e3d49	2026-07-10 02:06:31.727004
34	optimize-search-function-v1	ca80a3dc7bfef894df17108785ce29a7fc8ee456	2026-07-10 02:06:31.730131
35	add-insert-trigger-prefixes	458fe0ffd07ec53f5e3ce9df51bfdf4861929ccc	2026-07-10 02:06:31.733364
36	optimise-existing-functions	6ae5fca6af5c55abe95369cd4f93985d1814ca8f	2026-07-10 02:06:31.736729
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-07-10 02:06:31.740126
38	iceberg-catalog-flag-on-buckets	02716b81ceec9705aed84aa1501657095b32e5c5	2026-07-10 02:06:31.744892
39	add-search-v2-sort-support	6706c5f2928846abee18461279799ad12b279b78	2026-07-10 02:06:31.759031
40	fix-prefix-race-conditions-optimized	7ad69982ae2d372b21f48fc4829ae9752c518f6b	2026-07-10 02:06:31.764777
41	add-object-level-update-trigger	07fcf1a22165849b7a029deed059ffcde08d1ae0	2026-07-10 02:06:31.770156
42	rollback-prefix-triggers	771479077764adc09e2ea2043eb627503c034cd4	2026-07-10 02:06:31.773749
43	fix-object-level	84b35d6caca9d937478ad8a797491f38b8c2979f	2026-07-10 02:06:31.777505
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-07-10 02:06:31.783429
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-07-10 02:06:31.791465
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-07-10 02:06:31.810777
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-07-10 02:06:31.815139
48	iceberg-catalog-ids	e0e8b460c609b9999ccd0df9ad14294613eed939	2026-07-10 02:06:31.818842
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-07-10 02:06:31.840871
50	search-v2-optimised	6323ac4f850aa14e7387eb32102869578b5bd478	2026-07-10 02:06:31.845013
51	index-backward-compatible-search	2ee395d433f76e38bcd3856debaf6e0e5b674011	2026-07-10 02:06:31.864095
52	drop-not-used-indexes-and-functions	5cc44c8696749ac11dd0dc37f2a3802075f3a171	2026-07-10 02:06:31.865714
53	drop-index-lower-name	d0cb18777d9e2a98ebe0bc5cc7a42e57ebe41854	2026-07-10 02:06:31.875205
54	drop-index-object-level	6289e048b1472da17c31a7eba1ded625a6457e67	2026-07-10 02:06:31.877687
55	prevent-direct-deletes	262a4798d5e0f2e7c8970232e03ce8be695d5819	2026-07-10 02:06:31.879285
56	fix-optimized-search-function	b823ed1e418101032fa01374edc9a436e54e3ed4	2026-07-10 02:06:31.884141
57	s3-multipart-uploads-metadata	f127886e00d1b374fadbc7c6b31e09336aad5287	2026-07-10 02:06:31.88955
58	operation-ergonomics	00ca5d483b3fe0d522133d9002ccc5df98365120	2026-07-10 02:06:31.893056
59	drop-unused-functions	38456f13e39691c2bbb4b5151d0d1cdbabd4a8c4	2026-07-10 02:06:31.897344
60	optimize-existing-functions-again	db35e1c91a9201e59f4fef8d972c2f277d68b157	2026-07-10 02:06:31.901332
61	mark-filename-immutable	fe0096517ae9d60aaec1d110172ba9036dc66bb7	2026-08-11 12:22:00.724515
62	object-versioning-core	0b855f00ff3be0bfca91efee02a9858912491a9a	2026-08-22 03:46:43.865979
63	fix-search-name-relative-to-prefix	c7485e417624f795ce8bb2da21927f48e088904d	2026-08-27 12:05:53.874926
64	fix-search-by-timestamp-sqli	0af424ecd388a39bb1645184b222185a12149675	2026-08-27 12:05:53.917997
65	objects-key-version-index	603c1c55658e982d35839001e2c2b59a50703904	2026-09-08 08:04:38.892657
66	objects-current-version-index	191466c93aa2c46a00e36505577c5fcab8d7cb4b	2026-09-08 08:04:38.907992
67	objects-null-version-index	15bfe8c35b66642b6c78ba60060fa8793bd2207a	2026-09-08 08:04:38.915762
\.


--
-- TOC entry 4485 (class 0 OID 17415)
-- Dependencies: 270
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata, archived_at, is_delete_marker, is_versioned) FROM stdin;
0d6b3bf9-fc16-4081-a2b4-77d1da0e0fcb	gym-assets	logo-1783672862852.png	\N	2026-07-10 08:41:04.57048+00	2026-07-10 08:41:04.57048+00	2026-07-10 08:41:04.57048+00	{"eTag": "\\"29508ab23d3a8f82e5efcc2cbed15984\\"", "size": 303924, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-07-10T08:41:05.000Z", "contentLength": 303924, "httpStatusCode": 200}	26ee783e-ac90-4b66-9a7f-fa78e569e2ba	\N	{}	\N	f	f
d6a57381-9b8c-4d95-96d9-237bebe55772	gym-assets	members/cmrwr82no00426tlavzatxlnq-1784765378348.png	\N	2026-07-23 00:09:40.255209+00	2026-07-23 00:09:40.255209+00	2026-07-23 00:09:40.255209+00	{"eTag": "\\"dfff056a870d49049ac0722341dd27a4\\"", "size": 1560653, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-07-23T00:09:41.000Z", "contentLength": 1560653, "httpStatusCode": 200}	0769c51a-4960-4ed9-951b-6c981130840a	\N	{}	\N	f	f
5d6f7243-4832-4f66-9393-1321147fde83	gym-assets	members/cmrwr9cxa004l6tla6m4lxkdm-1784765437735.png	\N	2026-07-23 00:10:39.046713+00	2026-07-23 00:10:39.046713+00	2026-07-23 00:10:39.046713+00	{"eTag": "\\"0242a52d2a44e13a897b3d1c5f832fd4\\"", "size": 1393020, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-07-23T00:10:39.000Z", "contentLength": 1393020, "httpStatusCode": 200}	5f38dd49-9d7c-4544-9498-79f221c6e36d	\N	{}	\N	f	f
d0689b05-4c0b-4423-be04-016a113397ec	gym-assets	members/cmrwrgdex001bw9q0k383xnax-1784765765428.png	\N	2026-07-23 00:16:07.888762+00	2026-07-23 00:16:07.888762+00	2026-07-23 00:16:07.888762+00	{"eTag": "\\"eab0fe53ccf732362aab1f2790a6cb59\\"", "size": 1618313, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-07-23T00:16:08.000Z", "contentLength": 1618313, "httpStatusCode": 200}	82affab1-c7f2-4898-85e0-1781e989903d	\N	{}	\N	f	f
01c21bed-6a87-473b-8256-3caefddb3c5b	gym-assets	members/cmrwwosr7003jxxl4ux5orodc-1784774739958.jpg	\N	2026-07-23 02:45:41.454721+00	2026-07-23 02:45:41.454721+00	2026-07-23 02:45:41.454721+00	{"eTag": "\\"458945cbef4e59415b24aad65375b43d\\"", "size": 21413, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-07-23T02:45:42.000Z", "contentLength": 21413, "httpStatusCode": 200}	ca06ac26-e3d4-4a96-ae4b-37095a2d5094	\N	{}	\N	f	f
8d5aa584-e23c-4b2a-9d8b-3b8a7aab4abc	gym-assets	members/cmrwxs3v30089xxl433vjuq13-1784776392067.webp	\N	2026-07-23 03:13:13.325355+00	2026-07-23 03:13:13.325355+00	2026-07-23 03:13:13.325355+00	{"eTag": "\\"cd1a6c2f5e3178538151c39db98f4def\\"", "size": 42204, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-07-23T03:13:14.000Z", "contentLength": 42204, "httpStatusCode": 200}	b7ef0fbe-0356-4385-895d-864e61ccfc70	\N	{}	\N	f	f
bd9a2fba-8732-4835-948a-546fda7ea77a	gym-assets	members/cmrwxy6k6009exxl43b08v7py-1784776676021.jpg	\N	2026-07-23 03:17:57.195118+00	2026-07-23 03:17:57.195118+00	2026-07-23 03:17:57.195118+00	{"eTag": "\\"443213d981c6f90d1f367e514a1b1412\\"", "size": 20859, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-07-23T03:17:58.000Z", "contentLength": 20859, "httpStatusCode": 200}	4f1e8ffc-c94c-463b-9d08-4e017f0c46b3	\N	{}	\N	f	f
651aaea5-37e2-4c09-bc90-d813cb74d58a	gym-assets	members/cmry5pppg000z4dutp05ncq2n-1784850185149.webp	\N	2026-07-23 23:43:06.423157+00	2026-07-23 23:43:06.423157+00	2026-07-23 23:43:06.423157+00	{"eTag": "\\"eabe8c5ac6e70d28ce74b3a25d2ff280\\"", "size": 11784, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-07-23T23:43:07.000Z", "contentLength": 11784, "httpStatusCode": 200}	a979a893-f2dc-4998-a310-406acee72dde	\N	{}	\N	f	f
c4301f0a-8d58-438a-b70e-a8abe526c444	gym-assets	members/cms11vl5k00182xt0pwwhelmi-1785025137408.webp	\N	2026-07-26 00:18:59.186958+00	2026-07-26 00:18:59.186958+00	2026-07-26 00:18:59.186958+00	{"eTag": "\\"c929ff09b28b771429c36821cb4c37d0\\"", "size": 33360, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-07-26T00:19:00.000Z", "contentLength": 33360, "httpStatusCode": 200}	5584501e-e2c7-48a5-9a03-2de6b0237cd4	\N	{}	\N	f	f
b5e66844-08de-4632-bb71-6054a1606758	gym-assets	members/cms2sautz00127gvbo49pxm2q-1785129986144.webp	\N	2026-07-27 05:26:27.385533+00	2026-07-27 05:26:27.385533+00	2026-07-27 05:26:27.385533+00	{"eTag": "\\"178c422c8d766133db19127b618d9f8f\\"", "size": 15436, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-07-27T05:26:28.000Z", "contentLength": 15436, "httpStatusCode": 200}	493af647-29e8-4ea7-9b60-36a3b5609e21	\N	{}	\N	f	f
0e52e405-fe34-4a5e-8bf2-1428c3168d17	gym-assets	members/cms2uao9200157s7p131k9g6m-1785133335670.webp	\N	2026-07-27 06:22:16.575399+00	2026-07-27 06:22:16.575399+00	2026-07-27 06:22:16.575399+00	{"eTag": "\\"78087924c91559e4579ea5c10e6c0913\\"", "size": 30570, "mimetype": "image/webp", "cacheControl": "max-age=3600", "lastModified": "2026-07-27T06:22:17.000Z", "contentLength": 30570, "httpStatusCode": 200}	a58a08b9-2ddb-44f8-b05b-843bdc19db5f	\N	{}	\N	f	f
cfa35343-999a-49a8-8f68-20854217717f	gym-assets	members/cms2wdhn8004h7s7pvtmllr5r-1785136832045.jpg	\N	2026-07-27 07:20:33.457152+00	2026-07-27 07:20:33.457152+00	2026-07-27 07:20:33.457152+00	{"eTag": "\\"ad15bceda9bb8dd6dc57dd99c73c8504\\"", "size": 27796, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-07-27T07:20:34.000Z", "contentLength": 27796, "httpStatusCode": 200}	dcec74d1-3336-407d-ba20-827ccff4ab70	\N	{}	\N	f	f
258dc1aa-5877-4ddc-9bd2-8981452649bd	gym-assets	members/cmsh7wfvm005b4490yp5warp5-1786061272745.jpg	\N	2026-08-07 00:07:53.886257+00	2026-08-07 00:07:53.886257+00	2026-08-07 00:07:53.886257+00	{"eTag": "\\"c0832b8de9a2d6f1d2aed6ed181346a8\\"", "size": 20869, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-08-07T00:07:54.000Z", "contentLength": 20869, "httpStatusCode": 200}	debd566a-d280-4162-ade8-042ee558c96c	\N	{}	\N	f	f
f4c8bf20-43b9-4fa2-b501-a247c0181ab4	gym-assets	members/cmsnb0y0t000rxdi3tvelynho-1786370762101.jpg	\N	2026-08-10 14:06:03.977923+00	2026-08-10 14:06:03.977923+00	2026-08-10 14:06:03.977923+00	{"eTag": "\\"a54c9726338cb41e1256c4b794fd23e4\\"", "size": 1897270, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-08-10T14:06:04.000Z", "contentLength": 1897270, "httpStatusCode": 200}	2d1417d5-8518-4129-95a9-b1323e6dd471	\N	{}	\N	f	f
dcb9f1cc-4416-41f2-943a-dc8742a2e6f0	gym-assets	members/cmsnb0y0t000rxdi3tvelynho-1786450918154.jpg	\N	2026-08-11 12:21:59.276394+00	2026-08-11 12:21:59.276394+00	2026-08-11 12:21:59.276394+00	{"eTag": "\\"0bcd002aace2214ed68b3ab15ccee23e\\"", "size": 43388, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-08-11T12:22:00.000Z", "contentLength": 43388, "httpStatusCode": 200}	920021ea-96bb-4647-a19c-160b7651ea1d	\N	{}	\N	f	f
25c1d112-2915-4c6b-a359-89ce6ca7df5c	gym-assets	members/cmsnb0y0t000rxdi3tvelynho-1786450928250.jpg	\N	2026-08-11 12:22:08.643697+00	2026-08-11 12:22:08.643697+00	2026-08-11 12:22:08.643697+00	{"eTag": "\\"0bcd002aace2214ed68b3ab15ccee23e\\"", "size": 43388, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-08-11T12:22:09.000Z", "contentLength": 43388, "httpStatusCode": 200}	299972c0-6836-42f2-90bf-c72cfde86fb4	\N	{}	\N	f	f
\.


--
-- TOC entry 4486 (class 0 OID 17464)
-- Dependencies: 271
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata, metadata) FROM stdin;
\.


--
-- TOC entry 4487 (class 0 OID 17478)
-- Dependencies: 272
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- TOC entry 4490 (class 0 OID 17547)
-- Dependencies: 275
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3722 (class 0 OID 16612)
-- Dependencies: 241
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: -
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4557 (class 0 OID 0)
-- Dependencies: 236
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 1, false);


--
-- TOC entry 4558 (class 0 OID 0)
-- Dependencies: 283
-- Name: Receipt_number_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."Receipt_number_seq"', 4, true);


--
-- TOC entry 4559 (class 0 OID 0)
-- Dependencies: 263
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- TOC entry 3961 (class 2606 OID 16789)
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- TOC entry 3930 (class 2606 OID 16535)
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 4016 (class 2606 OID 17121)
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- TOC entry 4018 (class 2606 OID 17119)
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 3984 (class 2606 OID 16895)
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- TOC entry 3939 (class 2606 OID 16913)
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- TOC entry 3941 (class 2606 OID 16923)
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- TOC entry 3928 (class 2606 OID 16528)
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- TOC entry 3963 (class 2606 OID 16782)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- TOC entry 3959 (class 2606 OID 16770)
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- TOC entry 3951 (class 2606 OID 16963)
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- TOC entry 3953 (class 2606 OID 16757)
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- TOC entry 3997 (class 2606 OID 17022)
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- TOC entry 3999 (class 2606 OID 17020)
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- TOC entry 4001 (class 2606 OID 17018)
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- TOC entry 4011 (class 2606 OID 17080)
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- TOC entry 3994 (class 2606 OID 16982)
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- TOC entry 4005 (class 2606 OID 17044)
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- TOC entry 4007 (class 2606 OID 17046)
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- TOC entry 3988 (class 2606 OID 16948)
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 3922 (class 2606 OID 16518)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 3925 (class 2606 OID 16699)
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- TOC entry 3973 (class 2606 OID 16829)
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- TOC entry 3975 (class 2606 OID 16827)
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 3980 (class 2606 OID 16843)
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- TOC entry 3933 (class 2606 OID 16541)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 3946 (class 2606 OID 16720)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 3970 (class 2606 OID 16810)
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- TOC entry 3965 (class 2606 OID 16801)
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 3915 (class 2606 OID 16883)
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- TOC entry 3917 (class 2606 OID 16505)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4026 (class 2606 OID 17158)
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- TOC entry 4022 (class 2606 OID 17141)
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- TOC entry 4118 (class 2606 OID 23786)
-- Name: DietPlan DietPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DietPlan"
    ADD CONSTRAINT "DietPlan_pkey" PRIMARY KEY (id);


--
-- TOC entry 4127 (class 2606 OID 27034)
-- Name: Employee Employee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_pkey" PRIMARY KEY (id);


--
-- TOC entry 4140 (class 2606 OID 30539)
-- Name: Exercise Exercise_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Exercise"
    ADD CONSTRAINT "Exercise_pkey" PRIMARY KEY (id);


--
-- TOC entry 4131 (class 2606 OID 29732)
-- Name: GymEvent GymEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GymEvent"
    ADD CONSTRAINT "GymEvent_pkey" PRIMARY KEY (id);


--
-- TOC entry 4098 (class 2606 OID 18155)
-- Name: GymProfile GymProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GymProfile"
    ADD CONSTRAINT "GymProfile_pkey" PRIMARY KEY (id);


--
-- TOC entry 4105 (class 2606 OID 19534)
-- Name: Gym Gym_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Gym"
    ADD CONSTRAINT "Gym_pkey" PRIMARY KEY (id);


--
-- TOC entry 4136 (class 2606 OID 30456)
-- Name: LedgerTransaction LedgerTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LedgerTransaction"
    ADD CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY (id);


--
-- TOC entry 4079 (class 2606 OID 17665)
-- Name: Member Member_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Member"
    ADD CONSTRAINT "Member_pkey" PRIMARY KEY (id);


--
-- TOC entry 4074 (class 2606 OID 17657)
-- Name: Package Package_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Package"
    ADD CONSTRAINT "Package_pkey" PRIMARY KEY (id);


--
-- TOC entry 4093 (class 2606 OID 17683)
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- TOC entry 4103 (class 2606 OID 18165)
-- Name: Receipt Receipt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Receipt"
    ADD CONSTRAINT "Receipt_pkey" PRIMARY KEY (id);


--
-- TOC entry 4162 (class 2606 OID 30665)
-- Name: StaffLoginThrottle StaffLoginThrottle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffLoginThrottle"
    ADD CONSTRAINT "StaffLoginThrottle_pkey" PRIMARY KEY (key);


--
-- TOC entry 4087 (class 2606 OID 17673)
-- Name: Subscription Subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY (id);


--
-- TOC entry 4071 (class 2606 OID 17647)
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- TOC entry 4113 (class 2606 OID 19729)
-- Name: Visitor Visitor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Visitor"
    ADD CONSTRAINT "Visitor_pkey" PRIMARY KEY (id);


--
-- TOC entry 4165 (class 2606 OID 30699)
-- Name: WorkoutPlanDay WorkoutPlanDay_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutPlanDay"
    ADD CONSTRAINT "WorkoutPlanDay_pkey" PRIMARY KEY (id);


--
-- TOC entry 4144 (class 2606 OID 30554)
-- Name: WorkoutPlanExercise WorkoutPlanExercise_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutPlanExercise"
    ADD CONSTRAINT "WorkoutPlanExercise_pkey" PRIMARY KEY (id);


--
-- TOC entry 4123 (class 2606 OID 23794)
-- Name: WorkoutPlan WorkoutPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutPlan"
    ADD CONSTRAINT "WorkoutPlan_pkey" PRIMARY KEY (id);


--
-- TOC entry 4154 (class 2606 OID 30600)
-- Name: WorkoutSessionExercise WorkoutSessionExercise_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutSessionExercise"
    ADD CONSTRAINT "WorkoutSessionExercise_pkey" PRIMARY KEY (id);


--
-- TOC entry 4149 (class 2606 OID 30585)
-- Name: WorkoutSession WorkoutSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutSession"
    ADD CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY (id);


--
-- TOC entry 4159 (class 2606 OID 30621)
-- Name: WorkoutSetLog WorkoutSetLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutSetLog"
    ADD CONSTRAINT "WorkoutSetLog_pkey" PRIMARY KEY (id);


--
-- TOC entry 4067 (class 2606 OID 17613)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 3897 (class 2606 OID 17357)
-- Name: messages messages_payload_exclusive; Type: CHECK CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages
    ADD CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL))) NOT VALID;


--
-- TOC entry 4036 (class 2606 OID 17349)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4032 (class 2606 OID 17203)
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- TOC entry 4029 (class 2606 OID 17177)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 4059 (class 2606 OID 17570)
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- TOC entry 4043 (class 2606 OID 17413)
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- TOC entry 4062 (class 2606 OID 17546)
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- TOC entry 4038 (class 2606 OID 17404)
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- TOC entry 4040 (class 2606 OID 17402)
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 4052 (class 2606 OID 17425)
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- TOC entry 4057 (class 2606 OID 17487)
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- TOC entry 4055 (class 2606 OID 17472)
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- TOC entry 4065 (class 2606 OID 17556)
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- TOC entry 3931 (class 1259 OID 16536)
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- TOC entry 3901 (class 1259 OID 16709)
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4012 (class 1259 OID 17125)
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- TOC entry 4013 (class 1259 OID 17124)
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- TOC entry 4014 (class 1259 OID 17122)
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- TOC entry 4019 (class 1259 OID 17123)
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- TOC entry 3902 (class 1259 OID 16711)
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 3903 (class 1259 OID 16712)
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 3949 (class 1259 OID 16791)
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- TOC entry 3982 (class 1259 OID 16899)
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- TOC entry 3937 (class 1259 OID 16879)
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- TOC entry 4560 (class 0 OID 0)
-- Dependencies: 3937
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- TOC entry 3942 (class 1259 OID 16706)
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- TOC entry 3985 (class 1259 OID 16896)
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- TOC entry 4009 (class 1259 OID 17081)
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- TOC entry 3986 (class 1259 OID 16897)
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- TOC entry 3904 (class 1259 OID 17168)
-- Name: idx_users_created_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_created_at_desc ON auth.users USING btree (created_at DESC);


--
-- TOC entry 3905 (class 1259 OID 17167)
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_email ON auth.users USING btree (email);


--
-- TOC entry 3906 (class 1259 OID 17169)
-- Name: idx_users_last_sign_in_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_last_sign_in_at_desc ON auth.users USING btree (last_sign_in_at DESC);


--
-- TOC entry 3907 (class 1259 OID 17170)
-- Name: idx_users_name; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_name ON auth.users USING btree (((raw_user_meta_data ->> 'name'::text))) WHERE ((raw_user_meta_data ->> 'name'::text) IS NOT NULL);


--
-- TOC entry 3957 (class 1259 OID 16902)
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- TOC entry 3954 (class 1259 OID 16763)
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- TOC entry 3955 (class 1259 OID 16908)
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- TOC entry 3995 (class 1259 OID 17033)
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- TOC entry 3992 (class 1259 OID 16986)
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- TOC entry 4002 (class 1259 OID 17059)
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- TOC entry 4003 (class 1259 OID 17057)
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- TOC entry 4008 (class 1259 OID 17058)
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- TOC entry 3989 (class 1259 OID 16955)
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- TOC entry 3990 (class 1259 OID 16954)
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- TOC entry 3991 (class 1259 OID 16956)
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- TOC entry 3908 (class 1259 OID 16713)
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 3909 (class 1259 OID 16710)
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 3918 (class 1259 OID 16519)
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- TOC entry 3919 (class 1259 OID 16520)
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- TOC entry 3920 (class 1259 OID 16705)
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- TOC entry 3923 (class 1259 OID 16793)
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- TOC entry 3926 (class 1259 OID 16898)
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- TOC entry 3976 (class 1259 OID 16835)
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- TOC entry 3977 (class 1259 OID 16900)
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- TOC entry 3978 (class 1259 OID 16850)
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- TOC entry 3981 (class 1259 OID 16849)
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- TOC entry 3943 (class 1259 OID 16901)
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- TOC entry 3944 (class 1259 OID 17071)
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- TOC entry 3947 (class 1259 OID 16792)
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- TOC entry 3968 (class 1259 OID 16817)
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- TOC entry 3971 (class 1259 OID 16816)
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- TOC entry 3966 (class 1259 OID 16802)
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- TOC entry 3967 (class 1259 OID 16964)
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- TOC entry 3956 (class 1259 OID 16961)
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- TOC entry 3948 (class 1259 OID 16790)
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- TOC entry 3910 (class 1259 OID 16870)
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- TOC entry 4561 (class 0 OID 0)
-- Dependencies: 3910
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- TOC entry 3911 (class 1259 OID 16707)
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- TOC entry 3912 (class 1259 OID 16509)
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- TOC entry 3913 (class 1259 OID 16925)
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- TOC entry 4024 (class 1259 OID 17165)
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- TOC entry 4027 (class 1259 OID 17164)
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- TOC entry 4020 (class 1259 OID 17147)
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- TOC entry 4023 (class 1259 OID 17148)
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- TOC entry 4114 (class 1259 OID 23796)
-- Name: DietPlan_gymId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DietPlan_gymId_idx" ON public."DietPlan" USING btree ("gymId");


--
-- TOC entry 4115 (class 1259 OID 23795)
-- Name: DietPlan_gymId_memberId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DietPlan_gymId_memberId_key" ON public."DietPlan" USING btree ("gymId", "memberId");


--
-- TOC entry 4116 (class 1259 OID 23821)
-- Name: DietPlan_memberId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DietPlan_memberId_key" ON public."DietPlan" USING btree ("memberId");


--
-- TOC entry 4124 (class 1259 OID 27035)
-- Name: Employee_gymId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Employee_gymId_idx" ON public."Employee" USING btree ("gymId");


--
-- TOC entry 4125 (class 1259 OID 27036)
-- Name: Employee_gymId_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Employee_gymId_name_idx" ON public."Employee" USING btree ("gymId", name);


--
-- TOC entry 4137 (class 1259 OID 30541)
-- Name: Exercise_gymId_muscleGroup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Exercise_gymId_muscleGroup_idx" ON public."Exercise" USING btree ("gymId", "muscleGroup");


--
-- TOC entry 4138 (class 1259 OID 30540)
-- Name: Exercise_gymId_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Exercise_gymId_name_key" ON public."Exercise" USING btree ("gymId", name);


--
-- TOC entry 4128 (class 1259 OID 29734)
-- Name: GymEvent_gymId_eventDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GymEvent_gymId_eventDate_idx" ON public."GymEvent" USING btree ("gymId", "eventDate");


--
-- TOC entry 4129 (class 1259 OID 29733)
-- Name: GymEvent_gymId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "GymEvent_gymId_idx" ON public."GymEvent" USING btree ("gymId");


--
-- TOC entry 4096 (class 1259 OID 19573)
-- Name: GymProfile_gymId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "GymProfile_gymId_key" ON public."GymProfile" USING btree ("gymId");


--
-- TOC entry 4106 (class 1259 OID 23757)
-- Name: Gym_registrationToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Gym_registrationToken_key" ON public."Gym" USING btree ("registrationToken");


--
-- TOC entry 4107 (class 1259 OID 19535)
-- Name: Gym_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Gym_slug_key" ON public."Gym" USING btree (slug);


--
-- TOC entry 4132 (class 1259 OID 30457)
-- Name: LedgerTransaction_gymId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LedgerTransaction_gymId_idx" ON public."LedgerTransaction" USING btree ("gymId");


--
-- TOC entry 4133 (class 1259 OID 30458)
-- Name: LedgerTransaction_gymId_occurredOn_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LedgerTransaction_gymId_occurredOn_idx" ON public."LedgerTransaction" USING btree ("gymId", "occurredOn");


--
-- TOC entry 4134 (class 1259 OID 30459)
-- Name: LedgerTransaction_gymId_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "LedgerTransaction_gymId_type_idx" ON public."LedgerTransaction" USING btree ("gymId", type);


--
-- TOC entry 4075 (class 1259 OID 19715)
-- Name: Member_gymId_isPt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Member_gymId_isPt_idx" ON public."Member" USING btree ("gymId", "isPt");


--
-- TOC entry 4076 (class 1259 OID 19549)
-- Name: Member_gymId_memberNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Member_gymId_memberNumber_key" ON public."Member" USING btree ("gymId", "memberNumber");


--
-- TOC entry 4077 (class 1259 OID 19548)
-- Name: Member_gymId_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Member_gymId_name_idx" ON public."Member" USING btree ("gymId", name);


--
-- TOC entry 4080 (class 1259 OID 19716)
-- Name: Member_trainerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Member_trainerId_idx" ON public."Member" USING btree ("trainerId");


--
-- TOC entry 4072 (class 1259 OID 19542)
-- Name: Package_gymId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Package_gymId_idx" ON public."Package" USING btree ("gymId");


--
-- TOC entry 4089 (class 1259 OID 19561)
-- Name: Payment_gymId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_gymId_idx" ON public."Payment" USING btree ("gymId");


--
-- TOC entry 4090 (class 1259 OID 17688)
-- Name: Payment_memberId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_memberId_idx" ON public."Payment" USING btree ("memberId");


--
-- TOC entry 4091 (class 1259 OID 17689)
-- Name: Payment_paidAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_paidAt_idx" ON public."Payment" USING btree ("paidAt");


--
-- TOC entry 4094 (class 1259 OID 19685)
-- Name: Payment_recordedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_recordedById_idx" ON public."Payment" USING btree ("recordedById");


--
-- TOC entry 4095 (class 1259 OID 17690)
-- Name: Payment_subscriptionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_subscriptionId_idx" ON public."Payment" USING btree ("subscriptionId");


--
-- TOC entry 4099 (class 1259 OID 19567)
-- Name: Receipt_gymId_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Receipt_gymId_number_key" ON public."Receipt" USING btree ("gymId", number);


--
-- TOC entry 4100 (class 1259 OID 18167)
-- Name: Receipt_memberId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Receipt_memberId_idx" ON public."Receipt" USING btree ("memberId");


--
-- TOC entry 4101 (class 1259 OID 18166)
-- Name: Receipt_paymentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Receipt_paymentId_key" ON public."Receipt" USING btree ("paymentId");


--
-- TOC entry 4081 (class 1259 OID 19684)
-- Name: Subscription_createdById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_createdById_idx" ON public."Subscription" USING btree ("createdById");


--
-- TOC entry 4082 (class 1259 OID 17687)
-- Name: Subscription_endDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_endDate_idx" ON public."Subscription" USING btree ("endDate");


--
-- TOC entry 4083 (class 1259 OID 19555)
-- Name: Subscription_gymId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_gymId_idx" ON public."Subscription" USING btree ("gymId");


--
-- TOC entry 4084 (class 1259 OID 17686)
-- Name: Subscription_memberId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_memberId_idx" ON public."Subscription" USING btree ("memberId");


--
-- TOC entry 4085 (class 1259 OID 19683)
-- Name: Subscription_packageId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_packageId_idx" ON public."Subscription" USING btree ("packageId");


--
-- TOC entry 4088 (class 1259 OID 30668)
-- Name: Subscription_writtenOffById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Subscription_writtenOffById_idx" ON public."Subscription" USING btree ("writtenOffById");


--
-- TOC entry 4068 (class 1259 OID 17684)
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- TOC entry 4069 (class 1259 OID 19536)
-- Name: User_gymId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_gymId_idx" ON public."User" USING btree ("gymId");


--
-- TOC entry 4108 (class 1259 OID 19731)
-- Name: Visitor_gymId_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Visitor_gymId_name_idx" ON public."Visitor" USING btree ("gymId", name);


--
-- TOC entry 4109 (class 1259 OID 23759)
-- Name: Visitor_gymId_source_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Visitor_gymId_source_status_idx" ON public."Visitor" USING btree ("gymId", source, status);


--
-- TOC entry 4110 (class 1259 OID 23750)
-- Name: Visitor_gymId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Visitor_gymId_status_idx" ON public."Visitor" USING btree ("gymId", status);


--
-- TOC entry 4111 (class 1259 OID 19730)
-- Name: Visitor_gymId_visitDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Visitor_gymId_visitDate_idx" ON public."Visitor" USING btree ("gymId", "visitDate");


--
-- TOC entry 4163 (class 1259 OID 30701)
-- Name: WorkoutPlanDay_gymId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkoutPlanDay_gymId_idx" ON public."WorkoutPlanDay" USING btree ("gymId");


--
-- TOC entry 4166 (class 1259 OID 30700)
-- Name: WorkoutPlanDay_workoutPlanId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkoutPlanDay_workoutPlanId_sortOrder_idx" ON public."WorkoutPlanDay" USING btree ("workoutPlanId", "sortOrder");


--
-- TOC entry 4141 (class 1259 OID 30557)
-- Name: WorkoutPlanExercise_exerciseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkoutPlanExercise_exerciseId_idx" ON public."WorkoutPlanExercise" USING btree ("exerciseId");


--
-- TOC entry 4142 (class 1259 OID 30556)
-- Name: WorkoutPlanExercise_gymId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkoutPlanExercise_gymId_idx" ON public."WorkoutPlanExercise" USING btree ("gymId");


--
-- TOC entry 4145 (class 1259 OID 30718)
-- Name: WorkoutPlanExercise_workoutPlanDayId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkoutPlanExercise_workoutPlanDayId_sortOrder_idx" ON public."WorkoutPlanExercise" USING btree ("workoutPlanDayId", "sortOrder");


--
-- TOC entry 4146 (class 1259 OID 30555)
-- Name: WorkoutPlanExercise_workoutPlanId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkoutPlanExercise_workoutPlanId_sortOrder_idx" ON public."WorkoutPlanExercise" USING btree ("workoutPlanId", "sortOrder");


--
-- TOC entry 4119 (class 1259 OID 23798)
-- Name: WorkoutPlan_gymId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkoutPlan_gymId_idx" ON public."WorkoutPlan" USING btree ("gymId");


--
-- TOC entry 4120 (class 1259 OID 23797)
-- Name: WorkoutPlan_gymId_memberId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WorkoutPlan_gymId_memberId_key" ON public."WorkoutPlan" USING btree ("gymId", "memberId");


--
-- TOC entry 4121 (class 1259 OID 23822)
-- Name: WorkoutPlan_memberId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WorkoutPlan_memberId_key" ON public."WorkoutPlan" USING btree ("memberId");


--
-- TOC entry 4152 (class 1259 OID 30602)
-- Name: WorkoutSessionExercise_gymId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkoutSessionExercise_gymId_idx" ON public."WorkoutSessionExercise" USING btree ("gymId");


--
-- TOC entry 4155 (class 1259 OID 30603)
-- Name: WorkoutSessionExercise_workoutPlanExerciseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkoutSessionExercise_workoutPlanExerciseId_idx" ON public."WorkoutSessionExercise" USING btree ("workoutPlanExerciseId");


--
-- TOC entry 4156 (class 1259 OID 30601)
-- Name: WorkoutSessionExercise_workoutSessionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkoutSessionExercise_workoutSessionId_sortOrder_idx" ON public."WorkoutSessionExercise" USING btree ("workoutSessionId", "sortOrder");


--
-- TOC entry 4147 (class 1259 OID 30586)
-- Name: WorkoutSession_gymId_memberId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkoutSession_gymId_memberId_status_idx" ON public."WorkoutSession" USING btree ("gymId", "memberId", status);


--
-- TOC entry 4150 (class 1259 OID 30724)
-- Name: WorkoutSession_workoutPlanDayId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkoutSession_workoutPlanDayId_idx" ON public."WorkoutSession" USING btree ("workoutPlanDayId");


--
-- TOC entry 4151 (class 1259 OID 30587)
-- Name: WorkoutSession_workoutPlanId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkoutSession_workoutPlanId_idx" ON public."WorkoutSession" USING btree ("workoutPlanId");


--
-- TOC entry 4157 (class 1259 OID 30623)
-- Name: WorkoutSetLog_gymId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WorkoutSetLog_gymId_idx" ON public."WorkoutSetLog" USING btree ("gymId");


--
-- TOC entry 4160 (class 1259 OID 30622)
-- Name: WorkoutSetLog_sessionExerciseId_setNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "WorkoutSetLog_sessionExerciseId_setNumber_key" ON public."WorkoutSetLog" USING btree ("sessionExerciseId", "setNumber");


--
-- TOC entry 4030 (class 1259 OID 17350)
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- TOC entry 4034 (class 1259 OID 17351)
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4033 (class 1259 OID 17365)
-- Name: subscription_subscription_id_entity_filters_action_filter_selec; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_selec ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter, COALESCE(selected_columns, '{}'::text[]));


--
-- TOC entry 4041 (class 1259 OID 17414)
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- TOC entry 4044 (class 1259 OID 17431)
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- TOC entry 4060 (class 1259 OID 17571)
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- TOC entry 4053 (class 1259 OID 17498)
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- TOC entry 4045 (class 1259 OID 17463)
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- TOC entry 4046 (class 1259 OID 17578)
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- TOC entry 4047 (class 1259 OID 33783)
-- Name: idx_objects_current_version; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_objects_current_version ON storage.objects USING btree (bucket_id, name COLLATE "C") WHERE (archived_at IS NULL);


--
-- TOC entry 4048 (class 1259 OID 33784)
-- Name: idx_objects_null_version; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_objects_null_version ON storage.objects USING btree (bucket_id, name COLLATE "C") WHERE (NOT is_versioned);


--
-- TOC entry 4049 (class 1259 OID 17432)
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- TOC entry 4050 (class 1259 OID 33782)
-- Name: objects_bucket_id_name_version_key; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX objects_bucket_id_name_version_key ON storage.objects USING btree (bucket_id, name COLLATE "C", version) NULLS NOT DISTINCT;


--
-- TOC entry 4063 (class 1259 OID 17562)
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- TOC entry 4226 (class 2620 OID 17208)
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- TOC entry 4227 (class 2620 OID 17517)
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- TOC entry 4228 (class 2620 OID 17580)
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- TOC entry 4229 (class 2620 OID 17581)
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- TOC entry 4230 (class 2620 OID 17451)
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- TOC entry 4168 (class 2606 OID 16693)
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4173 (class 2606 OID 16783)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4172 (class 2606 OID 16771)
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- TOC entry 4171 (class 2606 OID 16758)
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4179 (class 2606 OID 17023)
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4180 (class 2606 OID 17028)
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4181 (class 2606 OID 17052)
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4182 (class 2606 OID 17047)
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4178 (class 2606 OID 16949)
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4167 (class 2606 OID 16726)
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4175 (class 2606 OID 16830)
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4176 (class 2606 OID 16903)
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- TOC entry 4177 (class 2606 OID 16844)
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4169 (class 2606 OID 17066)
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4170 (class 2606 OID 16721)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4174 (class 2606 OID 16811)
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4184 (class 2606 OID 17159)
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4183 (class 2606 OID 17142)
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4207 (class 2606 OID 23799)
-- Name: DietPlan DietPlan_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DietPlan"
    ADD CONSTRAINT "DietPlan_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4208 (class 2606 OID 23804)
-- Name: DietPlan DietPlan_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DietPlan"
    ADD CONSTRAINT "DietPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4211 (class 2606 OID 27037)
-- Name: Employee Employee_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4215 (class 2606 OID 30542)
-- Name: Exercise Exercise_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Exercise"
    ADD CONSTRAINT "Exercise_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4212 (class 2606 OID 29735)
-- Name: GymEvent GymEvent_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GymEvent"
    ADD CONSTRAINT "GymEvent_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4203 (class 2606 OID 19574)
-- Name: GymProfile GymProfile_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."GymProfile"
    ADD CONSTRAINT "GymProfile_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4213 (class 2606 OID 30465)
-- Name: LedgerTransaction LedgerTransaction_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LedgerTransaction"
    ADD CONSTRAINT "LedgerTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4214 (class 2606 OID 30460)
-- Name: LedgerTransaction LedgerTransaction_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."LedgerTransaction"
    ADD CONSTRAINT "LedgerTransaction_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4192 (class 2606 OID 19550)
-- Name: Member Member_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Member"
    ADD CONSTRAINT "Member_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4193 (class 2606 OID 19717)
-- Name: Member Member_trainerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Member"
    ADD CONSTRAINT "Member_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4191 (class 2606 OID 19543)
-- Name: Package Package_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Package"
    ADD CONSTRAINT "Package_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4199 (class 2606 OID 19562)
-- Name: Payment Payment_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4200 (class 2606 OID 17706)
-- Name: Payment Payment_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4201 (class 2606 OID 17716)
-- Name: Payment Payment_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4202 (class 2606 OID 17711)
-- Name: Payment Payment_subscriptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES public."Subscription"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4204 (class 2606 OID 19568)
-- Name: Receipt Receipt_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Receipt"
    ADD CONSTRAINT "Receipt_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4205 (class 2606 OID 18168)
-- Name: Receipt Receipt_paymentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Receipt"
    ADD CONSTRAINT "Receipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES public."Payment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4194 (class 2606 OID 17701)
-- Name: Subscription Subscription_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4195 (class 2606 OID 19556)
-- Name: Subscription Subscription_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4196 (class 2606 OID 17691)
-- Name: Subscription Subscription_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4197 (class 2606 OID 17696)
-- Name: Subscription Subscription_packageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES public."Package"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4198 (class 2606 OID 30669)
-- Name: Subscription Subscription_writtenOffById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_writtenOffById_fkey" FOREIGN KEY ("writtenOffById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4190 (class 2606 OID 19537)
-- Name: User User_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4206 (class 2606 OID 19732)
-- Name: Visitor Visitor_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Visitor"
    ADD CONSTRAINT "Visitor_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4224 (class 2606 OID 30702)
-- Name: WorkoutPlanDay WorkoutPlanDay_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutPlanDay"
    ADD CONSTRAINT "WorkoutPlanDay_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4225 (class 2606 OID 30707)
-- Name: WorkoutPlanDay WorkoutPlanDay_workoutPlanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutPlanDay"
    ADD CONSTRAINT "WorkoutPlanDay_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES public."WorkoutPlan"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4216 (class 2606 OID 30563)
-- Name: WorkoutPlanExercise WorkoutPlanExercise_exerciseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutPlanExercise"
    ADD CONSTRAINT "WorkoutPlanExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES public."Exercise"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4217 (class 2606 OID 30713)
-- Name: WorkoutPlanExercise WorkoutPlanExercise_workoutPlanDayId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutPlanExercise"
    ADD CONSTRAINT "WorkoutPlanExercise_workoutPlanDayId_fkey" FOREIGN KEY ("workoutPlanDayId") REFERENCES public."WorkoutPlanDay"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4218 (class 2606 OID 30558)
-- Name: WorkoutPlanExercise WorkoutPlanExercise_workoutPlanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutPlanExercise"
    ADD CONSTRAINT "WorkoutPlanExercise_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES public."WorkoutPlan"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4209 (class 2606 OID 23809)
-- Name: WorkoutPlan WorkoutPlan_gymId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutPlan"
    ADD CONSTRAINT "WorkoutPlan_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES public."Gym"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4210 (class 2606 OID 23814)
-- Name: WorkoutPlan WorkoutPlan_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutPlan"
    ADD CONSTRAINT "WorkoutPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4221 (class 2606 OID 30609)
-- Name: WorkoutSessionExercise WorkoutSessionExercise_workoutPlanExerciseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutSessionExercise"
    ADD CONSTRAINT "WorkoutSessionExercise_workoutPlanExerciseId_fkey" FOREIGN KEY ("workoutPlanExerciseId") REFERENCES public."WorkoutPlanExercise"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4222 (class 2606 OID 30604)
-- Name: WorkoutSessionExercise WorkoutSessionExercise_workoutSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutSessionExercise"
    ADD CONSTRAINT "WorkoutSessionExercise_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES public."WorkoutSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4219 (class 2606 OID 30719)
-- Name: WorkoutSession WorkoutSession_workoutPlanDayId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutSession"
    ADD CONSTRAINT "WorkoutSession_workoutPlanDayId_fkey" FOREIGN KEY ("workoutPlanDayId") REFERENCES public."WorkoutPlanDay"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4220 (class 2606 OID 30588)
-- Name: WorkoutSession WorkoutSession_workoutPlanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutSession"
    ADD CONSTRAINT "WorkoutSession_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES public."WorkoutPlan"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4223 (class 2606 OID 30624)
-- Name: WorkoutSetLog WorkoutSetLog_sessionExerciseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WorkoutSetLog"
    ADD CONSTRAINT "WorkoutSetLog_sessionExerciseId_fkey" FOREIGN KEY ("sessionExerciseId") REFERENCES public."WorkoutSessionExercise"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4185 (class 2606 OID 17426)
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- TOC entry 4186 (class 2606 OID 17473)
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- TOC entry 4187 (class 2606 OID 17493)
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- TOC entry 4188 (class 2606 OID 17488)
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- TOC entry 4189 (class 2606 OID 17557)
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- TOC entry 4382 (class 0 OID 16529)
-- Dependencies: 239
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4393 (class 0 OID 16889)
-- Dependencies: 252
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4384 (class 0 OID 16686)
-- Dependencies: 243
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4381 (class 0 OID 16522)
-- Dependencies: 238
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4388 (class 0 OID 16776)
-- Dependencies: 247
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4387 (class 0 OID 16764)
-- Dependencies: 246
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4386 (class 0 OID 16751)
-- Dependencies: 245
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4394 (class 0 OID 16939)
-- Dependencies: 253
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4380 (class 0 OID 16511)
-- Dependencies: 237
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4391 (class 0 OID 16818)
-- Dependencies: 250
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4392 (class 0 OID 16836)
-- Dependencies: 251
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4383 (class 0 OID 16537)
-- Dependencies: 240
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4385 (class 0 OID 16716)
-- Dependencies: 244
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4390 (class 0 OID 16803)
-- Dependencies: 249
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4389 (class 0 OID 16794)
-- Dependencies: 248
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4379 (class 0 OID 16499)
-- Dependencies: 235
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4413 (class 0 OID 23779)
-- Dependencies: 287
-- Name: DietPlan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."DietPlan" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4415 (class 0 OID 27027)
-- Dependencies: 289
-- Name: Employee; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."Employee" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4418 (class 0 OID 30531)
-- Dependencies: 292
-- Name: Exercise; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."Exercise" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4411 (class 0 OID 19525)
-- Dependencies: 285
-- Name: Gym; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."Gym" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4416 (class 0 OID 29725)
-- Dependencies: 290
-- Name: GymEvent; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."GymEvent" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4409 (class 0 OID 18147)
-- Dependencies: 282
-- Name: GymProfile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."GymProfile" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4417 (class 0 OID 30449)
-- Dependencies: 291
-- Name: LedgerTransaction; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."LedgerTransaction" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4406 (class 0 OID 17658)
-- Dependencies: 279
-- Name: Member; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."Member" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4405 (class 0 OID 17648)
-- Dependencies: 278
-- Name: Package; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."Package" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4408 (class 0 OID 17674)
-- Dependencies: 281
-- Name: Payment; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."Payment" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4410 (class 0 OID 18157)
-- Dependencies: 284
-- Name: Receipt; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."Receipt" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4423 (class 0 OID 30658)
-- Dependencies: 297
-- Name: StaffLoginThrottle; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."StaffLoginThrottle" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4407 (class 0 OID 17666)
-- Dependencies: 280
-- Name: Subscription; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."Subscription" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4404 (class 0 OID 17639)
-- Dependencies: 277
-- Name: User; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4412 (class 0 OID 19722)
-- Dependencies: 286
-- Name: Visitor; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."Visitor" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4414 (class 0 OID 23787)
-- Dependencies: 288
-- Name: WorkoutPlan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."WorkoutPlan" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4424 (class 0 OID 30692)
-- Dependencies: 298
-- Name: WorkoutPlanDay; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."WorkoutPlanDay" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4419 (class 0 OID 30547)
-- Dependencies: 293
-- Name: WorkoutPlanExercise; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."WorkoutPlanExercise" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4420 (class 0 OID 30577)
-- Dependencies: 294
-- Name: WorkoutSession; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."WorkoutSession" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4421 (class 0 OID 30593)
-- Dependencies: 295
-- Name: WorkoutSessionExercise; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."WorkoutSessionExercise" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4422 (class 0 OID 30614)
-- Dependencies: 296
-- Name: WorkoutSetLog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public."WorkoutSetLog" ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4443 (class 3256 OID 23819)
-- Name: DietPlan diet_plan_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY diet_plan_tenant_all ON public."DietPlan" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4445 (class 3256 OID 28377)
-- Name: Employee employee_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employee_tenant_all ON public."Employee" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4448 (class 3256 OID 30568)
-- Name: Exercise exercise_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY exercise_tenant_all ON public."Exercise" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4446 (class 3256 OID 29740)
-- Name: GymEvent gym_event_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gym_event_tenant_all ON public."GymEvent" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4433 (class 3256 OID 19665)
-- Name: GymProfile gym_profile_super_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gym_profile_super_admin_insert ON public."GymProfile" FOR INSERT WITH CHECK (public.app_is_super_admin());


--
-- TOC entry 4434 (class 3256 OID 19666)
-- Name: GymProfile gym_profile_super_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gym_profile_super_admin_select ON public."GymProfile" FOR SELECT USING (public.app_is_super_admin());


--
-- TOC entry 4432 (class 3256 OID 19664)
-- Name: GymProfile gym_profile_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gym_profile_tenant_all ON public."GymProfile" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4441 (class 3256 OID 19682)
-- Name: Gym gym_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gym_select ON public."Gym" FOR SELECT USING (((id = public.app_current_gym_id()) OR public.app_is_super_admin()));


--
-- TOC entry 4426 (class 3256 OID 19658)
-- Name: Gym gym_super_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gym_super_admin_insert ON public."Gym" FOR INSERT WITH CHECK (public.app_is_super_admin());


--
-- TOC entry 4425 (class 3256 OID 19656)
-- Name: Gym gym_tenant_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gym_tenant_update ON public."Gym" FOR UPDATE USING ((id = public.app_current_gym_id())) WITH CHECK ((id = public.app_current_gym_id()));


--
-- TOC entry 4447 (class 3256 OID 30470)
-- Name: LedgerTransaction ledger_transaction_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ledger_transaction_tenant_all ON public."LedgerTransaction" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4436 (class 3256 OID 19668)
-- Name: Member member_super_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_super_admin_select ON public."Member" FOR SELECT USING (public.app_is_super_admin());


--
-- TOC entry 4435 (class 3256 OID 19667)
-- Name: Member member_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY member_tenant_all ON public."Member" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4437 (class 3256 OID 19669)
-- Name: Package package_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY package_tenant_all ON public."Package" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4439 (class 3256 OID 19671)
-- Name: Payment payment_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payment_tenant_all ON public."Payment" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4440 (class 3256 OID 19672)
-- Name: Receipt receipt_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY receipt_tenant_all ON public."Receipt" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4453 (class 3256 OID 30666)
-- Name: StaffLoginThrottle staff_login_throttle_platform; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_login_throttle_platform ON public."StaffLoginThrottle" USING ((public.app_is_platform_lookup() OR public.app_is_super_admin())) WITH CHECK ((public.app_is_platform_lookup() OR public.app_is_super_admin()));


--
-- TOC entry 4438 (class 3256 OID 19670)
-- Name: Subscription subscription_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscription_tenant_all ON public."Subscription" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4427 (class 3256 OID 19659)
-- Name: User user_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_select ON public."User" FOR SELECT USING ((public.app_is_platform_lookup() OR public.app_is_super_admin() OR ("gymId" = public.app_current_gym_id())));


--
-- TOC entry 4429 (class 3256 OID 19661)
-- Name: User user_super_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_super_admin_insert ON public."User" FOR INSERT WITH CHECK ((public.app_is_super_admin() AND ("gymId" IS NOT NULL)));


--
-- TOC entry 4431 (class 3256 OID 19663)
-- Name: User user_tenant_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_tenant_delete ON public."User" FOR DELETE USING (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4428 (class 3256 OID 19660)
-- Name: User user_tenant_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_tenant_insert ON public."User" FOR INSERT WITH CHECK (((NOT public.app_is_super_admin()) AND ("gymId" = public.app_current_gym_id())));


--
-- TOC entry 4430 (class 3256 OID 19662)
-- Name: User user_tenant_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_tenant_update ON public."User" FOR UPDATE USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4442 (class 3256 OID 19737)
-- Name: Visitor visitor_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY visitor_tenant_all ON public."Visitor" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4454 (class 3256 OID 30712)
-- Name: WorkoutPlanDay workout_plan_day_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workout_plan_day_tenant_all ON public."WorkoutPlanDay" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4449 (class 3256 OID 30569)
-- Name: WorkoutPlanExercise workout_plan_exercise_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workout_plan_exercise_tenant_all ON public."WorkoutPlanExercise" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4444 (class 3256 OID 23820)
-- Name: WorkoutPlan workout_plan_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workout_plan_tenant_all ON public."WorkoutPlan" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4451 (class 3256 OID 30630)
-- Name: WorkoutSessionExercise workout_session_exercise_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workout_session_exercise_tenant_all ON public."WorkoutSessionExercise" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4450 (class 3256 OID 30629)
-- Name: WorkoutSession workout_session_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workout_session_tenant_all ON public."WorkoutSession" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4452 (class 3256 OID 30631)
-- Name: WorkoutSetLog workout_set_log_tenant_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workout_set_log_tenant_all ON public."WorkoutSetLog" USING (("gymId" = public.app_current_gym_id())) WITH CHECK (("gymId" = public.app_current_gym_id()));


--
-- TOC entry 4395 (class 0 OID 17335)
-- Dependencies: 267
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4397 (class 0 OID 17405)
-- Dependencies: 269
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4401 (class 0 OID 17524)
-- Dependencies: 273
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4402 (class 0 OID 17537)
-- Dependencies: 274
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4396 (class 0 OID 17397)
-- Dependencies: 268
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4398 (class 0 OID 17415)
-- Dependencies: 270
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4399 (class 0 OID 17464)
-- Dependencies: 271
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4400 (class 0 OID 17478)
-- Dependencies: 272
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4403 (class 0 OID 17547)
-- Dependencies: 275
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4455 (class 6104 OID 16430)
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- TOC entry 3716 (class 3466 OID 16575)
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- TOC entry 3719 (class 3466 OID 16654)
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- TOC entry 3721 (class 3466 OID 16666)
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- TOC entry 3720 (class 3466 OID 16657)
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- TOC entry 3717 (class 3466 OID 16576)
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- TOC entry 3718 (class 3466 OID 16577)
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


-- Completed on 2026-09-08 14:05:12

--
-- PostgreSQL database dump complete
--

\unrestrict Cl5lorA2LITur3zmlg5WOUzc1kdFu7k1L38kAklNYOtH9KK3tvGdsuW7x5fqwMt

