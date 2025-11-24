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
-- Name: update_user_statistics(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_user_statistics() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update statistics for all players in the completed hand
  INSERT INTO user_statistics (
    user_id, hands_played, games_played, hands_won, 
    total_winnings, win_rate, avg_pot_won, last_played
  )
  SELECT 
    hp.user_id,
    COUNT(DISTINCT hp.hand_id) as hands_played,
    COUNT(DISTINCT ph.table_id) as games_played,
    SUM(CASE WHEN hp.is_winner THEN 1 ELSE 0 END) as hands_won,
    SUM(hp.profit) as total_winnings,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND((SUM(CASE WHEN hp.is_winner THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric * 100), 2)
      ELSE 0 
    END as win_rate,
    CASE 
      WHEN SUM(CASE WHEN hp.is_winner THEN 1 ELSE 0 END) > 0 
      THEN ROUND(SUM(CASE WHEN hp.is_winner THEN hp.profit ELSE 0 END)::numeric / SUM(CASE WHEN hp.is_winner THEN 1 ELSE 0 END)::numeric, 2)
      ELSE 0 
    END as avg_pot_won,
    MAX(ph.ended_at) as last_played
  FROM hand_players hp
  JOIN poker_hands ph ON hp.hand_id = ph.id
  WHERE hp.user_id IN (
    SELECT user_id FROM hand_players WHERE hand_id = NEW.id
  )
  AND ph.ended_at IS NOT NULL
  GROUP BY hp.user_id
  ON CONFLICT (user_id) DO UPDATE SET
    hands_played = EXCLUDED.hands_played,
    games_played = EXCLUDED.games_played,
    hands_won = EXCLUDED.hands_won,
    total_winnings = EXCLUDED.total_winnings,
    win_rate = EXCLUDED.win_rate,
    avg_pot_won = EXCLUDED.avg_pot_won,
    last_played = EXCLUDED.last_played,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_statistics() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: game_players; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_players (
    id integer NOT NULL,
    game_table_id integer,
    user_id integer,
    seat_position integer NOT NULL,
    chip_count numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    joined_at timestamp without time zone DEFAULT now(),
    CONSTRAINT game_players_seat_position_check CHECK (((seat_position >= 1) AND (seat_position <= 9)))
);


ALTER TABLE public.game_players OWNER TO postgres;

--
-- Name: game_players_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.game_players_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.game_players_id_seq OWNER TO postgres;

--
-- Name: game_players_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.game_players_id_seq OWNED BY public.game_players.id;


--
-- Name: game_tables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_tables (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    game_type character varying(50) DEFAULT 'No Limit Hold''em'::character varying NOT NULL,
    max_players integer DEFAULT 6 NOT NULL,
    small_blind numeric(10,2) NOT NULL,
    big_blind numeric(10,2) NOT NULL,
    buy_in numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'waiting'::character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.game_tables OWNER TO postgres;

--
-- Name: game_tables_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.game_tables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.game_tables_id_seq OWNER TO postgres;

--
-- Name: game_tables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.game_tables_id_seq OWNED BY public.game_tables.id;


--
-- Name: hand_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hand_actions (
    id integer NOT NULL,
    hand_id integer,
    player_username character varying(255),
    action_type character varying(50) NOT NULL,
    amount integer,
    pot_after integer NOT NULL,
    current_bet integer,
    phase character varying(20) NOT NULL,
    action_order integer NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.hand_actions OWNER TO postgres;

--
-- Name: hand_actions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hand_actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hand_actions_id_seq OWNER TO postgres;

--
-- Name: hand_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hand_actions_id_seq OWNED BY public.hand_actions.id;


--
-- Name: hand_players; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hand_players (
    id integer NOT NULL,
    hand_id integer,
    user_id integer,
    username character varying(255) NOT NULL,
    "position" integer NOT NULL,
    starting_chips integer NOT NULL,
    ending_chips integer NOT NULL,
    profit integer NOT NULL,
    cards jsonb,
    is_winner boolean DEFAULT false,
    folded_at character varying(20),
    final_hand_rank character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.hand_players OWNER TO postgres;

--
-- Name: hand_players_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hand_players_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hand_players_id_seq OWNER TO postgres;

--
-- Name: hand_players_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hand_players_id_seq OWNED BY public.hand_players.id;


--
-- Name: poker_games; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.poker_games (
    id integer NOT NULL,
    table_id character varying(255) NOT NULL,
    table_name character varying(255),
    small_blind integer NOT NULL,
    big_blind integer NOT NULL,
    game_type character varying(50) DEFAULT 'no-limit-holdem'::character varying,
    started_at timestamp without time zone DEFAULT now() NOT NULL,
    ended_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.poker_games OWNER TO postgres;

--
-- Name: poker_games_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.poker_games_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.poker_games_id_seq OWNER TO postgres;

--
-- Name: poker_games_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.poker_games_id_seq OWNED BY public.poker_games.id;


--
-- Name: poker_hands; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.poker_hands (
    id integer NOT NULL,
    game_id integer,
    hand_id character varying(255) NOT NULL,
    table_id character varying(255) NOT NULL,
    dealer_position integer NOT NULL,
    small_blind integer NOT NULL,
    big_blind integer NOT NULL,
    pot_size integer NOT NULL,
    board_flop jsonb,
    board_turn character varying(10),
    board_river character varying(10),
    winning_hand text,
    hand_duration integer,
    started_at timestamp without time zone NOT NULL,
    ended_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.poker_hands OWNER TO postgres;

--
-- Name: poker_hands_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.poker_hands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.poker_hands_id_seq OWNER TO postgres;

--
-- Name: poker_hands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.poker_hands_id_seq OWNED BY public.poker_hands.id;


--
-- Name: user_statistics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_statistics (
    user_id integer NOT NULL,
    games_played integer DEFAULT 0,
    hands_played integer DEFAULT 0,
    hands_won integer DEFAULT 0,
    total_winnings numeric(10,2) DEFAULT 0,
    win_rate numeric(5,2) DEFAULT 0,
    avg_pot_won numeric(10,2) DEFAULT 0,
    last_played timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_statistics OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    avatar_url text,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: game_players id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_players ALTER COLUMN id SET DEFAULT nextval('public.game_players_id_seq'::regclass);


--
-- Name: game_tables id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_tables ALTER COLUMN id SET DEFAULT nextval('public.game_tables_id_seq'::regclass);


--
-- Name: hand_actions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hand_actions ALTER COLUMN id SET DEFAULT nextval('public.hand_actions_id_seq'::regclass);


--
-- Name: hand_players id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hand_players ALTER COLUMN id SET DEFAULT nextval('public.hand_players_id_seq'::regclass);


--
-- Name: poker_games id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poker_games ALTER COLUMN id SET DEFAULT nextval('public.poker_games_id_seq'::regclass);


--
-- Name: poker_hands id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poker_hands ALTER COLUMN id SET DEFAULT nextval('public.poker_hands_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: game_players game_players_game_table_id_seat_position_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_players
    ADD CONSTRAINT game_players_game_table_id_seat_position_key UNIQUE (game_table_id, seat_position);


--
-- Name: game_players game_players_game_table_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_players
    ADD CONSTRAINT game_players_game_table_id_user_id_key UNIQUE (game_table_id, user_id);


--
-- Name: game_players game_players_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_players
    ADD CONSTRAINT game_players_pkey PRIMARY KEY (id);


--
-- Name: game_tables game_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_tables
    ADD CONSTRAINT game_tables_pkey PRIMARY KEY (id);


--
-- Name: hand_actions hand_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hand_actions
    ADD CONSTRAINT hand_actions_pkey PRIMARY KEY (id);


--
-- Name: hand_players hand_players_hand_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hand_players
    ADD CONSTRAINT hand_players_hand_id_user_id_key UNIQUE (hand_id, user_id);


--
-- Name: hand_players hand_players_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hand_players
    ADD CONSTRAINT hand_players_pkey PRIMARY KEY (id);


--
-- Name: poker_games poker_games_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poker_games
    ADD CONSTRAINT poker_games_pkey PRIMARY KEY (id);


--
-- Name: poker_hands poker_hands_hand_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poker_hands
    ADD CONSTRAINT poker_hands_hand_id_key UNIQUE (hand_id);


--
-- Name: poker_hands poker_hands_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poker_hands
    ADD CONSTRAINT poker_hands_pkey PRIMARY KEY (id);


--
-- Name: user_statistics user_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_statistics
    ADD CONSTRAINT user_statistics_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_game_players_table_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_game_players_table_id ON public.game_players USING btree (game_table_id);


--
-- Name: idx_game_players_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_game_players_user_id ON public.game_players USING btree (user_id);


--
-- Name: idx_game_tables_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_game_tables_status ON public.game_tables USING btree (status);


--
-- Name: idx_hand_actions_action_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hand_actions_action_order ON public.hand_actions USING btree (hand_id, action_order);


--
-- Name: idx_hand_actions_hand_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hand_actions_hand_id ON public.hand_actions USING btree (hand_id);


--
-- Name: idx_hand_players_hand_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hand_players_hand_id ON public.hand_players USING btree (hand_id);


--
-- Name: idx_hand_players_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hand_players_user_id ON public.hand_players USING btree (user_id);


--
-- Name: idx_poker_hands_started_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_poker_hands_started_at ON public.poker_hands USING btree (started_at DESC);


--
-- Name: idx_poker_hands_table_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_poker_hands_table_id ON public.poker_hands USING btree (table_id);


--
-- Name: poker_hands trigger_update_user_statistics; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_user_statistics AFTER UPDATE OF ended_at ON public.poker_hands FOR EACH ROW WHEN (((new.ended_at IS NOT NULL) AND (old.ended_at IS NULL))) EXECUTE FUNCTION public.update_user_statistics();


--
-- Name: poker_hands update_user_stats_on_hand_end; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_stats_on_hand_end AFTER UPDATE OF ended_at ON public.poker_hands FOR EACH ROW WHEN (((old.ended_at IS NULL) AND (new.ended_at IS NOT NULL))) EXECUTE FUNCTION public.update_user_statistics();


--
-- Name: game_players game_players_game_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_players
    ADD CONSTRAINT game_players_game_table_id_fkey FOREIGN KEY (game_table_id) REFERENCES public.game_tables(id) ON DELETE CASCADE;


--
-- Name: game_players game_players_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_players
    ADD CONSTRAINT game_players_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: game_tables game_tables_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_tables
    ADD CONSTRAINT game_tables_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: hand_actions hand_actions_hand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hand_actions
    ADD CONSTRAINT hand_actions_hand_id_fkey FOREIGN KEY (hand_id) REFERENCES public.poker_hands(id) ON DELETE CASCADE;


--
-- Name: hand_players hand_players_hand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hand_players
    ADD CONSTRAINT hand_players_hand_id_fkey FOREIGN KEY (hand_id) REFERENCES public.poker_hands(id) ON DELETE CASCADE;


--
-- Name: hand_players hand_players_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hand_players
    ADD CONSTRAINT hand_players_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: poker_hands poker_hands_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.poker_hands
    ADD CONSTRAINT poker_hands_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.poker_games(id) ON DELETE CASCADE;


--
-- Name: user_statistics user_statistics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_statistics
    ADD CONSTRAINT user_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

