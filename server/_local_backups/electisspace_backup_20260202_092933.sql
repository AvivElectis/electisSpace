--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: CodeType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CodeType" AS ENUM (
    'LOGIN_2FA',
    'PASSWORD_RESET'
);


ALTER TYPE public."CodeType" OWNER TO postgres;

--
-- Name: CompanyRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CompanyRole" AS ENUM (
    'COMPANY_ADMIN',
    'VIEWER'
);


ALTER TYPE public."CompanyRole" OWNER TO postgres;

--
-- Name: GlobalRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."GlobalRole" AS ENUM (
    'PLATFORM_ADMIN'
);


ALTER TYPE public."GlobalRole" OWNER TO postgres;

--
-- Name: QueueStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."QueueStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);


ALTER TYPE public."QueueStatus" OWNER TO postgres;

--
-- Name: StoreRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."StoreRole" AS ENUM (
    'STORE_ADMIN',
    'STORE_MANAGER',
    'STORE_EMPLOYEE',
    'STORE_VIEWER'
);


ALTER TYPE public."StoreRole" OWNER TO postgres;

--
-- Name: SyncStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SyncStatus" AS ENUM (
    'PENDING',
    'SYNCING',
    'SYNCED',
    'FAILED'
);


ALTER TYPE public."SyncStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    store_id text,
    user_id text,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id text,
    old_data jsonb,
    new_data jsonb,
    ip_address character varying(45),
    user_agent text,
    permission_checked character varying(100),
    was_authorized boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    aims_company_code character varying(50) NOT NULL,
    aims_base_url character varying(255),
    aims_cluster character varying(50),
    aims_username character varying(255),
    aims_password_enc text,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: conference_rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conference_rooms (
    id text NOT NULL,
    store_id text NOT NULL,
    external_id character varying(50) NOT NULL,
    room_name character varying(100) NOT NULL,
    label_code character varying(50),
    has_meeting boolean DEFAULT false NOT NULL,
    meeting_name character varying(255),
    start_time character varying(10),
    end_time character varying(10),
    participants text[] DEFAULT ARRAY[]::text[],
    sync_status public."SyncStatus" DEFAULT 'PENDING'::public."SyncStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.conference_rooms OWNER TO postgres;

--
-- Name: people; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.people (
    id text NOT NULL,
    store_id text NOT NULL,
    external_id character varying(50),
    virtual_space_id character varying(50),
    assigned_space_id text,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    sync_status public."SyncStatus" DEFAULT 'PENDING'::public."SyncStatus" NOT NULL,
    last_synced_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.people OWNER TO postgres;

--
-- Name: people_list_memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.people_list_memberships (
    id text NOT NULL,
    person_id text NOT NULL,
    list_id text NOT NULL,
    space_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.people_list_memberships OWNER TO postgres;

--
-- Name: people_lists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.people_lists (
    id text NOT NULL,
    store_id text NOT NULL,
    name character varying(100) NOT NULL,
    storage_name character varying(100) NOT NULL,
    created_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.people_lists OWNER TO postgres;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id text NOT NULL,
    user_id text NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    revoked boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: spaces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.spaces (
    id text NOT NULL,
    store_id text NOT NULL,
    external_id character varying(50) NOT NULL,
    label_code character varying(50),
    template_name character varying(100),
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    sync_status public."SyncStatus" DEFAULT 'PENDING'::public."SyncStatus" NOT NULL,
    last_synced_at timestamp(3) without time zone,
    created_by text,
    updated_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.spaces OWNER TO postgres;

--
-- Name: stores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stores (
    id text NOT NULL,
    company_id text NOT NULL,
    name character varying(100) NOT NULL,
    store_number character varying(50) NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    timezone character varying(50) DEFAULT 'UTC'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.stores OWNER TO postgres;

--
-- Name: sync_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sync_queue (
    id text NOT NULL,
    store_id text NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id text NOT NULL,
    action character varying(20) NOT NULL,
    payload jsonb NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    status public."QueueStatus" DEFAULT 'PENDING'::public."QueueStatus" NOT NULL,
    error_message text,
    scheduled_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.sync_queue OWNER TO postgres;

--
-- Name: user_companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_companies (
    id text NOT NULL,
    user_id text NOT NULL,
    company_id text NOT NULL,
    role public."CompanyRole" DEFAULT 'VIEWER'::public."CompanyRole" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.user_companies OWNER TO postgres;

--
-- Name: user_stores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_stores (
    id text NOT NULL,
    user_id text NOT NULL,
    store_id text NOT NULL,
    role public."StoreRole" DEFAULT 'STORE_VIEWER'::public."StoreRole" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    features jsonb DEFAULT '["dashboard"]'::jsonb NOT NULL
);


ALTER TABLE public.user_stores OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    global_role public."GlobalRole",
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: verification_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verification_codes (
    id text NOT NULL,
    user_id text NOT NULL,
    code character varying(10) NOT NULL,
    type public."CodeType" NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.verification_codes OWNER TO postgres;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
0e0d27d6-63ac-4f00-8be1-61433f00df89	41c721c58a06b5562faa370fa996ea49a83be554d45c8c8888772380701e6e87	2026-01-26 08:29:11.364263+00	20260126082910_enhanced_permissions	\N	\N	2026-01-26 08:29:10.419609+00	1
f0144a9e-4a32-419c-a65e-8366673b1cbd	dc34439d2e141567bfbf75728734127878173973a6549bbe733ed19676a4ba16	2026-01-26 08:47:49.868559+00	20260126084749_add_2fa_verification_codes	\N	\N	2026-01-26 08:47:49.818703+00	1
796a1331-2f67-4467-9d6e-1f7c086dc4e2	b8cba54b808580e3dcc16248cdc18cdba1cc9666eca43378ad647e95cd9d8fe3	2026-02-01 10:55:33.495206+00	20260201105533_add_user_store_features	\N	\N	2026-02-01 10:55:33.194607+00	1
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, store_id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent, permission_checked, was_authorized, created_at) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, name, aims_company_code, aims_base_url, aims_cluster, aims_username, aims_password_enc, settings, is_active, created_at, updated_at) FROM stdin;
5fe05f6f-356f-4c87-91b2-5a13aca630cb	AIMS Test Company	TEST001	https://api.aims.test	test-cluster	test_api_user	encrypted_password_here	{"timezone": "Asia/Jerusalem", "defaultLanguage": "he"}	t	2026-01-26 09:34:51.224	2026-01-26 09:34:51.224
\.


--
-- Data for Name: conference_rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conference_rooms (id, store_id, external_id, room_name, label_code, has_meeting, meeting_name, start_time, end_time, participants, sync_status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: people; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.people (id, store_id, external_id, virtual_space_id, assigned_space_id, data, sync_status, last_synced_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: people_list_memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.people_list_memberships (id, person_id, list_id, space_id, created_at) FROM stdin;
\.


--
-- Data for Name: people_lists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.people_lists (id, store_id, name, storage_name, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at) FROM stdin;
b0eebd74-b8d7-4516-a1f2-9a1ef4124bc6	cab11a52-a803-4705-8ed6-e99872c4b22b	$2b$10$wbsn1IwO6gIO62ykCzGdTOpmvma16Ye3DWzLqvg.MXl9naWK0P9PO	2026-02-02 09:44:40.6	t	2026-01-26 09:44:40.601
f2f6ab7f-614c-4cf2-9d15-4e1274822710	cab11a52-a803-4705-8ed6-e99872c4b22b	$2b$10$g7pYQKbpadYzJ072Mm3STOIwY837mS/0cyLBuvLMc9IMkhgisxrOW	2026-02-08 09:46:29.222	t	2026-02-01 09:46:29.224
6baf380b-e918-47ab-84ef-d8ef8f2b0b12	cab11a52-a803-4705-8ed6-e99872c4b22b	$2b$10$deAKZNma2aGXCZBUbdy6HOkDDsDAlR3WKIrF5r.ZnHG2qKjkYjGbG	2026-02-08 09:52:12.849	t	2026-02-01 09:52:12.85
cd19ad65-8004-4965-8217-d5bbbae4f6ff	cab11a52-a803-4705-8ed6-e99872c4b22b	$2b$10$4zq2NZs3g1jO2ao2kKn/juZRmRbmHGu61ojg4w2W/yZsKakVsOEsi	2026-02-08 10:56:23.628	t	2026-02-01 10:56:23.63
d37149f8-16f0-41d5-893c-2a5913a49dae	cab11a52-a803-4705-8ed6-e99872c4b22b	$2b$10$w/btTBZtcyuAX/B4vZPv7e3ldU2VIaQdxjDUPPs6OLlpmuSsc6Kyq	2026-02-08 11:58:25.062	t	2026-02-01 11:58:25.063
\.


--
-- Data for Name: spaces; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.spaces (id, store_id, external_id, label_code, template_name, data, sync_status, last_synced_at, created_by, updated_by, created_at, updated_at) FROM stdin;
f8fa19ef-4dc8-4774-bcab-dd16bdcd1909	afa5936c-a2a3-481a-bb3c-bf820beaf29a	ROOM-101	\N	\N	{"floor": "1", "capacity": "50", "roomName": "Electronics Section"}	SYNCED	\N	\N	\N	2026-01-26 09:34:51.416	2026-01-26 09:34:51.416
\.


--
-- Data for Name: stores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stores (id, company_id, name, store_number, settings, timezone, is_active, created_at, updated_at) FROM stdin;
afa5936c-a2a3-481a-bb3c-bf820beaf29a	5fe05f6f-356f-4c87-91b2-5a13aca630cb	Main Store	001	{"language": "he", "enableAutoSync": true}	Asia/Jerusalem	t	2026-01-26 09:34:51.23	2026-01-26 09:34:51.23
26de9a77-65ff-435a-8d74-8c5e541c7a59	5fe05f6f-356f-4c87-91b2-5a13aca630cb	Second Store	002	{"language": "he", "enableAutoSync": true}	Asia/Jerusalem	t	2026-01-26 09:34:51.234	2026-01-26 09:34:51.234
\.


--
-- Data for Name: sync_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sync_queue (id, store_id, entity_type, entity_id, action, payload, attempts, max_attempts, status, error_message, scheduled_at, processed_at, created_at) FROM stdin;
\.


--
-- Data for Name: user_companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_companies (id, user_id, company_id, role, created_at, updated_at) FROM stdin;
9e35c61d-1f20-4469-bcf3-f7076d09bdfe	0d410937-b743-4e75-a53b-637eaa637c23	5fe05f6f-356f-4c87-91b2-5a13aca630cb	COMPANY_ADMIN	2026-01-26 09:34:51.327	2026-01-26 09:34:51.327
e1d802c3-c808-4485-af80-30c590358f14	1b07fb82-0456-4472-9fb9-82b13706dc73	5fe05f6f-356f-4c87-91b2-5a13aca630cb	VIEWER	2026-01-26 09:34:51.346	2026-01-26 09:34:51.346
1564e843-4bd3-4841-a060-517ab16a26e0	8ef62f82-c5a3-4a55-b723-3e94a7924702	5fe05f6f-356f-4c87-91b2-5a13aca630cb	VIEWER	2026-01-26 09:34:51.368	2026-01-26 09:34:51.368
68a54d6a-1624-4fbc-891d-b6ffd4db854d	049711f3-3900-4487-882a-5fde78825b7b	5fe05f6f-356f-4c87-91b2-5a13aca630cb	VIEWER	2026-01-26 09:34:51.387	2026-01-26 09:34:51.387
62f6ceb3-119b-4f05-8dea-c5dfa8b50a31	17b82964-2f21-4042-a56b-8dc2323aceb8	5fe05f6f-356f-4c87-91b2-5a13aca630cb	VIEWER	2026-01-26 09:34:51.404	2026-01-26 09:34:51.404
\.


--
-- Data for Name: user_stores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_stores (id, user_id, store_id, role, created_at, updated_at, features) FROM stdin;
746a0b2b-fe7c-41d4-ab0b-84320894c687	0d410937-b743-4e75-a53b-637eaa637c23	afa5936c-a2a3-481a-bb3c-bf820beaf29a	STORE_ADMIN	2026-01-26 09:34:51.334	2026-01-26 09:34:51.334	["dashboard"]
d6076257-fe9f-41af-833f-2c7f7bbb4d01	0d410937-b743-4e75-a53b-637eaa637c23	26de9a77-65ff-435a-8d74-8c5e541c7a59	STORE_ADMIN	2026-01-26 09:34:51.334	2026-01-26 09:34:51.334	["dashboard"]
c5fabe22-51ce-4a6f-8a68-9c619ccc9e42	1b07fb82-0456-4472-9fb9-82b13706dc73	afa5936c-a2a3-481a-bb3c-bf820beaf29a	STORE_ADMIN	2026-01-26 09:34:51.353	2026-01-26 09:34:51.353	["dashboard"]
ee9961d8-0877-48c8-ad6b-f58c226967fc	8ef62f82-c5a3-4a55-b723-3e94a7924702	afa5936c-a2a3-481a-bb3c-bf820beaf29a	STORE_MANAGER	2026-01-26 09:34:51.374	2026-01-26 09:34:51.374	["dashboard"]
cf9afb08-90d7-44e7-a4a9-db2ce890f475	049711f3-3900-4487-882a-5fde78825b7b	afa5936c-a2a3-481a-bb3c-bf820beaf29a	STORE_EMPLOYEE	2026-01-26 09:34:51.394	2026-01-26 09:34:51.394	["dashboard"]
d885aabb-50fe-4f36-a729-d9e41da4205e	17b82964-2f21-4042-a56b-8dc2323aceb8	afa5936c-a2a3-481a-bb3c-bf820beaf29a	STORE_VIEWER	2026-01-26 09:34:51.409	2026-02-01 12:32:38.323	["dashboard", "spaces", "conference", "people"]
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, first_name, last_name, global_role, is_active, last_login, created_at, updated_at) FROM stdin;
0d410937-b743-4e75-a53b-637eaa637c23	company.admin@test.com	$2b$10$cJ37zC9Jzhp4/h2ZhyttW.LBsj1zmGrYyR0H1fdyKroo.isj77kUa	Company	Admin	\N	t	\N	2026-01-26 09:34:51.32	2026-01-26 09:34:51.32
1b07fb82-0456-4472-9fb9-82b13706dc73	store.admin@test.com	$2b$10$cJ37zC9Jzhp4/h2ZhyttW.LBsj1zmGrYyR0H1fdyKroo.isj77kUa	Store	Admin	\N	t	\N	2026-01-26 09:34:51.341	2026-01-26 09:34:51.341
8ef62f82-c5a3-4a55-b723-3e94a7924702	manager@test.com	$2b$10$cJ37zC9Jzhp4/h2ZhyttW.LBsj1zmGrYyR0H1fdyKroo.isj77kUa	Store	Manager	\N	t	\N	2026-01-26 09:34:51.362	2026-01-26 09:34:51.362
049711f3-3900-4487-882a-5fde78825b7b	employee@test.com	$2b$10$cJ37zC9Jzhp4/h2ZhyttW.LBsj1zmGrYyR0H1fdyKroo.isj77kUa	Store	Employee	\N	t	\N	2026-01-26 09:34:51.379	2026-01-26 09:34:51.379
cab11a52-a803-4705-8ed6-e99872c4b22b	aviv@electis.co.il	$2b$10$cJ37zC9Jzhp4/h2ZhyttW.LBsj1zmGrYyR0H1fdyKroo.isj77kUa	Aviv	Admin	PLATFORM_ADMIN	t	2026-02-01 11:58:25.083	2026-01-26 09:34:51.309	2026-02-01 11:58:25.084
17b82964-2f21-4042-a56b-8dc2323aceb8	viewer@test.com	$2b$10$cJ37zC9Jzhp4/h2ZhyttW.LBsj1zmGrYyR0H1fdyKroo.isj77kUa	Store	Viewer	\N	t	\N	2026-01-26 09:34:51.399	2026-02-01 12:32:38.256
\.


--
-- Data for Name: verification_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.verification_codes (id, user_id, code, type, expires_at, used, created_at) FROM stdin;
cf12db08-fd61-422c-8e47-4b2fc9548900	cab11a52-a803-4705-8ed6-e99872c4b22b	480141	LOGIN_2FA	2026-01-26 09:54:00.605	t	2026-01-26 09:44:00.606
609d84f4-2a12-4ed9-a824-2da4869cad06	cab11a52-a803-4705-8ed6-e99872c4b22b	900491	LOGIN_2FA	2026-02-01 09:52:51.569	t	2026-02-01 09:42:51.571
4bc77bfa-47a3-4275-8336-1f173474a806	cab11a52-a803-4705-8ed6-e99872c4b22b	890677	LOGIN_2FA	2026-02-01 09:56:08.174	t	2026-02-01 09:46:08.175
372da9e2-c764-4587-9db9-8dc42ab097bb	cab11a52-a803-4705-8ed6-e99872c4b22b	511708	LOGIN_2FA	2026-02-01 09:59:58.797	t	2026-02-01 09:49:58.798
20a46b14-a775-4266-b869-3977ba6c1438	cab11a52-a803-4705-8ed6-e99872c4b22b	460296	LOGIN_2FA	2026-02-01 10:01:44.794	t	2026-02-01 09:51:44.796
97afead2-5bd7-40ac-b983-5afe802f6c56	cab11a52-a803-4705-8ed6-e99872c4b22b	898841	LOGIN_2FA	2026-02-01 11:06:11.603	t	2026-02-01 10:56:11.604
f983018d-df6a-4424-ac9f-4175ae016862	cab11a52-a803-4705-8ed6-e99872c4b22b	224807	LOGIN_2FA	2026-02-01 12:07:51.393	t	2026-02-01 11:57:51.395
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: conference_rooms conference_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conference_rooms
    ADD CONSTRAINT conference_rooms_pkey PRIMARY KEY (id);


--
-- Name: people_list_memberships people_list_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.people_list_memberships
    ADD CONSTRAINT people_list_memberships_pkey PRIMARY KEY (id);


--
-- Name: people_lists people_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.people_lists
    ADD CONSTRAINT people_lists_pkey PRIMARY KEY (id);


--
-- Name: people people_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: spaces spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT spaces_pkey PRIMARY KEY (id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: sync_queue sync_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_queue
    ADD CONSTRAINT sync_queue_pkey PRIMARY KEY (id);


--
-- Name: user_companies user_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_pkey PRIMARY KEY (id);


--
-- Name: user_stores user_stores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_stores
    ADD CONSTRAINT user_stores_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verification_codes verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);


--
-- Name: audit_logs_entity_type_entity_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_entity_type_entity_id_idx ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: audit_logs_store_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_store_id_idx ON public.audit_logs USING btree (store_id);


--
-- Name: audit_logs_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_user_id_idx ON public.audit_logs USING btree (user_id);


--
-- Name: companies_aims_company_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX companies_aims_company_code_key ON public.companies USING btree (aims_company_code);


--
-- Name: conference_rooms_store_id_external_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX conference_rooms_store_id_external_id_key ON public.conference_rooms USING btree (store_id, external_id);


--
-- Name: conference_rooms_store_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conference_rooms_store_id_idx ON public.conference_rooms USING btree (store_id);


--
-- Name: people_assigned_space_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX people_assigned_space_id_idx ON public.people USING btree (assigned_space_id);


--
-- Name: people_list_memberships_list_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX people_list_memberships_list_id_idx ON public.people_list_memberships USING btree (list_id);


--
-- Name: people_list_memberships_person_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX people_list_memberships_person_id_idx ON public.people_list_memberships USING btree (person_id);


--
-- Name: people_list_memberships_person_id_list_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX people_list_memberships_person_id_list_id_key ON public.people_list_memberships USING btree (person_id, list_id);


--
-- Name: people_lists_store_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX people_lists_store_id_idx ON public.people_lists USING btree (store_id);


--
-- Name: people_lists_store_id_storage_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX people_lists_store_id_storage_name_key ON public.people_lists USING btree (store_id, storage_name);


--
-- Name: people_store_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX people_store_id_idx ON public.people USING btree (store_id);


--
-- Name: refresh_tokens_token_hash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX refresh_tokens_token_hash_idx ON public.refresh_tokens USING btree (token_hash);


--
-- Name: refresh_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX refresh_tokens_user_id_idx ON public.refresh_tokens USING btree (user_id);


--
-- Name: spaces_label_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX spaces_label_code_idx ON public.spaces USING btree (label_code);


--
-- Name: spaces_store_id_external_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX spaces_store_id_external_id_key ON public.spaces USING btree (store_id, external_id);


--
-- Name: spaces_store_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX spaces_store_id_idx ON public.spaces USING btree (store_id);


--
-- Name: stores_company_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stores_company_id_idx ON public.stores USING btree (company_id);


--
-- Name: stores_company_id_store_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX stores_company_id_store_number_key ON public.stores USING btree (company_id, store_number);


--
-- Name: sync_queue_status_scheduled_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sync_queue_status_scheduled_at_idx ON public.sync_queue USING btree (status, scheduled_at);


--
-- Name: sync_queue_store_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sync_queue_store_id_idx ON public.sync_queue USING btree (store_id);


--
-- Name: user_companies_company_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_companies_company_id_idx ON public.user_companies USING btree (company_id);


--
-- Name: user_companies_user_id_company_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_companies_user_id_company_id_key ON public.user_companies USING btree (user_id, company_id);


--
-- Name: user_companies_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_companies_user_id_idx ON public.user_companies USING btree (user_id);


--
-- Name: user_stores_store_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_stores_store_id_idx ON public.user_stores USING btree (store_id);


--
-- Name: user_stores_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_stores_user_id_idx ON public.user_stores USING btree (user_id);


--
-- Name: user_stores_user_id_store_id_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_stores_user_id_store_id_key ON public.user_stores USING btree (user_id, store_id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: verification_codes_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX verification_codes_code_idx ON public.verification_codes USING btree (code);


--
-- Name: verification_codes_user_id_type_used_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX verification_codes_user_id_type_used_idx ON public.verification_codes USING btree (user_id, type, used);


--
-- Name: audit_logs audit_logs_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: conference_rooms conference_rooms_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conference_rooms
    ADD CONSTRAINT conference_rooms_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: people people_assigned_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_assigned_space_id_fkey FOREIGN KEY (assigned_space_id) REFERENCES public.spaces(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: people_list_memberships people_list_memberships_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.people_list_memberships
    ADD CONSTRAINT people_list_memberships_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.people_lists(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: people_list_memberships people_list_memberships_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.people_list_memberships
    ADD CONSTRAINT people_list_memberships_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: people_list_memberships people_list_memberships_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.people_list_memberships
    ADD CONSTRAINT people_list_memberships_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: people_lists people_lists_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.people_lists
    ADD CONSTRAINT people_lists_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: people_lists people_lists_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.people_lists
    ADD CONSTRAINT people_lists_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: people people_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: spaces spaces_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT spaces_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: spaces spaces_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT spaces_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: spaces spaces_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT spaces_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stores stores_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sync_queue sync_queue_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_queue
    ADD CONSTRAINT sync_queue_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_companies user_companies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_companies user_companies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_stores user_stores_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_stores
    ADD CONSTRAINT user_stores_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_stores user_stores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_stores
    ADD CONSTRAINT user_stores_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: verification_codes verification_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

