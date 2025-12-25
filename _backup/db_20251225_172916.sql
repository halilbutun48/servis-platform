--
-- PostgreSQL database dump
--

\restrict 22D9jkN4pGJaqaFV5CIWXiUUgvo3oCd8BC8HMBm03G4oIKp0HEXEBpAQ2x9SMxA

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg13+1)
-- Dumped by pg_dump version 16.11 (Debian 16.11-1.pgdg13+1)

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
-- Name: AttendanceType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AttendanceType" AS ENUM (
    'BOARD',
    'DROP',
    'ABSENT'
);


ALTER TYPE public."AttendanceType" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPER_ADMIN',
    'SERVICE_ROOM',
    'SCHOOL_ADMIN',
    'DRIVER',
    'PARENT'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Absence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Absence" (
    id integer NOT NULL,
    "studentId" integer NOT NULL,
    day timestamp(3) without time zone NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Absence" OWNER TO postgres;

--
-- Name: Absence_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Absence_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Absence_id_seq" OWNER TO postgres;

--
-- Name: Absence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Absence_id_seq" OWNED BY public."Absence".id;


--
-- Name: AttendanceEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AttendanceEvent" (
    id integer NOT NULL,
    "studentId" integer NOT NULL,
    type public."AttendanceType" NOT NULL,
    "routeStopId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    source text DEFAULT 'MANUAL'::text NOT NULL
);


ALTER TABLE public."AttendanceEvent" OWNER TO postgres;

--
-- Name: AttendanceEvent_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."AttendanceEvent_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."AttendanceEvent_id_seq" OWNER TO postgres;

--
-- Name: AttendanceEvent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."AttendanceEvent_id_seq" OWNED BY public."AttendanceEvent".id;


--
-- Name: GpsLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."GpsLog" (
    id integer NOT NULL,
    "vehicleId" integer NOT NULL,
    lat double precision NOT NULL,
    lon double precision NOT NULL,
    speed double precision,
    heading double precision,
    "recordedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."GpsLog" OWNER TO postgres;

--
-- Name: GpsLog_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."GpsLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."GpsLog_id_seq" OWNER TO postgres;

--
-- Name: GpsLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."GpsLog_id_seq" OWNED BY public."GpsLog".id;


--
-- Name: PingLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PingLog" (
    id integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PingLog" OWNER TO postgres;

--
-- Name: PingLog_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."PingLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."PingLog_id_seq" OWNER TO postgres;

--
-- Name: PingLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."PingLog_id_seq" OWNED BY public."PingLog".id;


--
-- Name: Route; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Route" (
    id integer NOT NULL,
    name text NOT NULL,
    "schoolId" integer NOT NULL,
    "vehicleId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Route" OWNER TO postgres;

--
-- Name: RouteStop; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RouteStop" (
    id integer NOT NULL,
    "routeId" integer NOT NULL,
    ord integer NOT NULL,
    name text NOT NULL,
    lat double precision NOT NULL,
    lon double precision NOT NULL
);


ALTER TABLE public."RouteStop" OWNER TO postgres;

--
-- Name: RouteStop_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."RouteStop_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."RouteStop_id_seq" OWNER TO postgres;

--
-- Name: RouteStop_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."RouteStop_id_seq" OWNED BY public."RouteStop".id;


--
-- Name: Route_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Route_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Route_id_seq" OWNER TO postgres;

--
-- Name: Route_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Route_id_seq" OWNED BY public."Route".id;


--
-- Name: School; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."School" (
    id integer NOT NULL,
    name text NOT NULL,
    lat double precision,
    lon double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."School" OWNER TO postgres;

--
-- Name: School_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."School_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."School_id_seq" OWNER TO postgres;

--
-- Name: School_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."School_id_seq" OWNED BY public."School".id;


--
-- Name: Student; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Student" (
    id integer NOT NULL,
    "fullName" text NOT NULL,
    "schoolId" integer NOT NULL,
    "parentUserId" integer,
    "routeId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Student" OWNER TO postgres;

--
-- Name: Student_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Student_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Student_id_seq" OWNER TO postgres;

--
-- Name: Student_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Student_id_seq" OWNED BY public."Student".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."UserRole" NOT NULL,
    "schoolId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: Vehicle; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Vehicle" (
    id integer NOT NULL,
    plate text NOT NULL,
    "schoolId" integer NOT NULL,
    "driverUserId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Vehicle" OWNER TO postgres;

--
-- Name: Vehicle_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Vehicle_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Vehicle_id_seq" OWNER TO postgres;

--
-- Name: Vehicle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Vehicle_id_seq" OWNED BY public."Vehicle".id;


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
-- Name: Absence id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Absence" ALTER COLUMN id SET DEFAULT nextval('public."Absence_id_seq"'::regclass);


--
-- Name: AttendanceEvent id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AttendanceEvent" ALTER COLUMN id SET DEFAULT nextval('public."AttendanceEvent_id_seq"'::regclass);


--
-- Name: GpsLog id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GpsLog" ALTER COLUMN id SET DEFAULT nextval('public."GpsLog_id_seq"'::regclass);


--
-- Name: PingLog id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PingLog" ALTER COLUMN id SET DEFAULT nextval('public."PingLog_id_seq"'::regclass);


--
-- Name: Route id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Route" ALTER COLUMN id SET DEFAULT nextval('public."Route_id_seq"'::regclass);


--
-- Name: RouteStop id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RouteStop" ALTER COLUMN id SET DEFAULT nextval('public."RouteStop_id_seq"'::regclass);


--
-- Name: School id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."School" ALTER COLUMN id SET DEFAULT nextval('public."School_id_seq"'::regclass);


--
-- Name: Student id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student" ALTER COLUMN id SET DEFAULT nextval('public."Student_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Name: Vehicle id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Vehicle" ALTER COLUMN id SET DEFAULT nextval('public."Vehicle_id_seq"'::regclass);


--
-- Data for Name: Absence; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Absence" (id, "studentId", day, reason, "createdAt") FROM stdin;
\.


--
-- Data for Name: AttendanceEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AttendanceEvent" (id, "studentId", type, "routeStopId", "createdAt", source) FROM stdin;
\.


--
-- Data for Name: GpsLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."GpsLog" (id, "vehicleId", lat, lon, speed, heading, "recordedAt", "createdAt") FROM stdin;
1	1	41.0094	28.9794	13	181	2025-12-25 12:53:59.499	2025-12-25 12:53:59.501
2	1	41.0094	28.9794	13	181	2025-12-25 13:04:37.84	2025-12-25 13:04:37.843
3	1	41.0102	28.9808	12	90	2025-12-25 13:13:11.234	2025-12-25 13:13:11.235
4	1	41.0102	28.9808	12	90	2025-12-25 13:17:06.492	2025-12-25 13:17:06.493
5	1	41.0106	28.9814	12	90	2025-12-25 13:23:19.486	2025-12-25 13:23:19.492
6	1	41.0106	28.9814	12	90	2025-12-25 13:23:54.078	2025-12-25 13:23:54.084
7	1	41.0106	28.9814	12	90	2025-12-25 13:28:43.007	2025-12-25 13:28:43.012
8	1	41.0106	28.9814	12	90	2025-12-25 13:45:30.188	2025-12-25 13:45:30.19
\.


--
-- Data for Name: PingLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PingLog" (id, "createdAt") FROM stdin;
1	2025-12-25 12:53:49.052
2	2025-12-25 13:04:26.395
3	2025-12-25 13:42:49.042
4	2025-12-25 14:15:47.97
\.


--
-- Data for Name: Route; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Route" (id, name, "schoolId", "vehicleId", "createdAt") FROM stdin;
1	Demo Rota	1	1	2025-12-25 12:53:24.822
\.


--
-- Data for Name: RouteStop; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RouteStop" (id, "routeId", ord, name, lat, lon) FROM stdin;
1	1	1	Durak 1	41.01	28.98
2	1	2	Durak 2	41.012	28.982
3	1	3	222	41.008742	28.985265
\.


--
-- Data for Name: School; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."School" (id, name, lat, lon, "createdAt") FROM stdin;
1	Demo Okul	41.0094	28.9794	2025-12-25 12:53:24.58
2	Demo Okul 2	41.02	28.99	2025-12-25 13:57:36.563
3	Demo Okul 2	41.02	28.99	2025-12-25 13:59:23.66
\.


--
-- Data for Name: Student; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Student" (id, "fullName", "schoolId", "parentUserId", "routeId", "createdAt") FROM stdin;
1	Seed Ogrenci 1	1	5	1	2025-12-25 12:53:24.827
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, "passwordHash", role, "schoolId", "createdAt") FROM stdin;
1	admin@demo.com	$2b$10$0VjFaMQjrLDLElJrITfpFOCyQlG2ZkOTPYvE7lwV6VS0Dpn0bV19W	SUPER_ADMIN	\N	2025-12-25 12:53:24.629
2	room@demo.com	$2b$10$Mx4v2Axxs8XsZ0L0KM6X7.NUlZYUeNkqDHCjtm5qNNLwXlLdsPK5q	SERVICE_ROOM	\N	2025-12-25 12:53:24.678
3	school_admin@demo.com	$2b$10$eUJyinCXKDHZWhVifKDXROR5ehtsYkHp0H/6gxdYRaEMP0vD5gVae	SCHOOL_ADMIN	1	2025-12-25 12:53:24.725
4	driver_seed@demo.com	$2b$10$.NimsUQKNvKhcRKOJjMb/e7LnTaB3lOp.N9URu6NOBlsSySdomsR2	DRIVER	1	2025-12-25 12:53:24.771
5	parent_seed@demo.com	$2b$10$GJR2zlqNc2C4sHg.iQbkC.C4UHPmbZD89kzRIlSGHbUgFcmkD.u8.	PARENT	1	2025-12-25 12:53:24.818
\.


--
-- Data for Name: Vehicle; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Vehicle" (id, plate, "schoolId", "driverUserId", "createdAt") FROM stdin;
1	34 DEMO 001	1	4	2025-12-25 12:53:24.82
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
e6ffd7f8-9ac7-450a-8add-8f4b3e24f758	7e63b402655e82bf3814034099455d0a9f88d8c5245cca08d8254902bcc9ae71	2025-12-25 12:53:24.15236+00	20251225110930_init	\N	\N	2025-12-25 12:53:24.095854+00	1
\.


--
-- Name: Absence_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Absence_id_seq"', 1, true);


--
-- Name: AttendanceEvent_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AttendanceEvent_id_seq"', 1, true);


--
-- Name: GpsLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."GpsLog_id_seq"', 8, true);


--
-- Name: PingLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PingLog_id_seq"', 4, true);


--
-- Name: RouteStop_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."RouteStop_id_seq"', 3, true);


--
-- Name: Route_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Route_id_seq"', 1, true);


--
-- Name: School_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."School_id_seq"', 3, true);


--
-- Name: Student_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Student_id_seq"', 1, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 5, true);


--
-- Name: Vehicle_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Vehicle_id_seq"', 1, true);


--
-- Name: Absence Absence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Absence"
    ADD CONSTRAINT "Absence_pkey" PRIMARY KEY (id);


--
-- Name: AttendanceEvent AttendanceEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AttendanceEvent"
    ADD CONSTRAINT "AttendanceEvent_pkey" PRIMARY KEY (id);


--
-- Name: GpsLog GpsLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GpsLog"
    ADD CONSTRAINT "GpsLog_pkey" PRIMARY KEY (id);


--
-- Name: PingLog PingLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PingLog"
    ADD CONSTRAINT "PingLog_pkey" PRIMARY KEY (id);


--
-- Name: RouteStop RouteStop_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RouteStop"
    ADD CONSTRAINT "RouteStop_pkey" PRIMARY KEY (id);


--
-- Name: Route Route_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Route"
    ADD CONSTRAINT "Route_pkey" PRIMARY KEY (id);


--
-- Name: School School_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."School"
    ADD CONSTRAINT "School_pkey" PRIMARY KEY (id);


--
-- Name: Student Student_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Vehicle Vehicle_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Vehicle"
    ADD CONSTRAINT "Vehicle_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Absence_studentId_day_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Absence_studentId_day_key" ON public."Absence" USING btree ("studentId", day);


--
-- Name: Absence_studentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Absence_studentId_idx" ON public."Absence" USING btree ("studentId");


--
-- Name: AttendanceEvent_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AttendanceEvent_createdAt_idx" ON public."AttendanceEvent" USING btree ("createdAt");


--
-- Name: AttendanceEvent_studentId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AttendanceEvent_studentId_idx" ON public."AttendanceEvent" USING btree ("studentId");


--
-- Name: GpsLog_recordedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GpsLog_recordedAt_idx" ON public."GpsLog" USING btree ("recordedAt");


--
-- Name: GpsLog_vehicleId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "GpsLog_vehicleId_idx" ON public."GpsLog" USING btree ("vehicleId");


--
-- Name: RouteStop_routeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RouteStop_routeId_idx" ON public."RouteStop" USING btree ("routeId");


--
-- Name: RouteStop_routeId_ord_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RouteStop_routeId_ord_key" ON public."RouteStop" USING btree ("routeId", ord);


--
-- Name: Route_schoolId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Route_schoolId_idx" ON public."Route" USING btree ("schoolId");


--
-- Name: Route_vehicleId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Route_vehicleId_idx" ON public."Route" USING btree ("vehicleId");


--
-- Name: Student_parentUserId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Student_parentUserId_idx" ON public."Student" USING btree ("parentUserId");


--
-- Name: Student_routeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Student_routeId_idx" ON public."Student" USING btree ("routeId");


--
-- Name: Student_schoolId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Student_schoolId_idx" ON public."Student" USING btree ("schoolId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_schoolId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "User_schoolId_idx" ON public."User" USING btree ("schoolId");


--
-- Name: Vehicle_driverUserId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Vehicle_driverUserId_key" ON public."Vehicle" USING btree ("driverUserId");


--
-- Name: Vehicle_schoolId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Vehicle_schoolId_idx" ON public."Vehicle" USING btree ("schoolId");


--
-- Name: Absence Absence_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Absence"
    ADD CONSTRAINT "Absence_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AttendanceEvent AttendanceEvent_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AttendanceEvent"
    ADD CONSTRAINT "AttendanceEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: GpsLog GpsLog_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."GpsLog"
    ADD CONSTRAINT "GpsLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public."Vehicle"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RouteStop RouteStop_routeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RouteStop"
    ADD CONSTRAINT "RouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES public."Route"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Route Route_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Route"
    ADD CONSTRAINT "Route_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Route Route_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Route"
    ADD CONSTRAINT "Route_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public."Vehicle"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Student Student_parentUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Student Student_routeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES public."Route"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Student Student_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Vehicle Vehicle_driverUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Vehicle"
    ADD CONSTRAINT "Vehicle_driverUserId_fkey" FOREIGN KEY ("driverUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Vehicle Vehicle_schoolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Vehicle"
    ADD CONSTRAINT "Vehicle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public."School"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict 22D9jkN4pGJaqaFV5CIWXiUUgvo3oCd8BC8HMBm03G4oIKp0HEXEBpAQ2x9SMxA

