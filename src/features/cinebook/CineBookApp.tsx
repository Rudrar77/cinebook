import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown,
  CircleAlert, Clapperboard, Clock3, Film, Languages, MapPin, Menu, Minus, Play, Plus,
  Search, ShieldCheck, SlidersHorizontal, Star, Ticket, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bookingService } from "@/services/bookingService";
import { movieService } from "@/services/movieService";
import { showtimeService } from "@/services/showtimeService";
import { seatService } from "@/services/seatService";
import { ticketService } from "@/services/ticketService";
import { generateDemoUPIQRCode } from "@/services/paymentService";
import { getApiErrorMessage } from "@/services/api";
import { authService } from "@/services/authService";
import type { AuthRequest } from "@/services/authService";
import { adminService } from "@/services/adminService";
import { movies as seededMovies, getMovie as getSeededMovie, getShowtime as getSeededShowtime, showtimes as seededShowtimes } from "./catalog";
import type { Booking, Cinema, Movie, PaymentMethod, Screen, Seat, Showtime, TicketView } from "@/services/types";

const navLinks = [
  { label: "Home", to: "/" as const },
  { label: "Movies", to: "/movies" as const },
  { label: "My bookings", to: "/my-bookings" as const },
];

function useStoredCatalog() {
  const [catalogMovies, setCatalogMovies] = useState<Movie[]>(seededMovies);
  const [catalogShowtimes, setCatalogShowtimes] = useState<Showtime[]>(seededShowtimes);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([movieService.list(), showtimeService.list()])
      .then(([storedMovies, storedShowtimes]) => {
        if (!active) return;
        setCatalogMovies(storedMovies);
        setCatalogShowtimes(storedShowtimes);
      })
      .catch((requestError: unknown) => {
        if (active) setCatalogError(getApiErrorMessage(requestError));
      });
    return () => { active = false; };
  }, []);

  return { movies: catalogMovies, showtimes: catalogShowtimes, error: catalogError };
}

function Header({ active = "Home" }: { active?: string | undefined }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="relative z-20 border-b border-cinema-line bg-background/90 backdrop-blur-xl">
      <div className="mx-auto grid min-h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 sm:flex sm:px-7 lg:px-10">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="CineBook home">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-cinema-red text-primary-foreground"><Ticket size={19} strokeWidth={2.3} /></span>
          <span className="text-display truncate text-[19px] font-bold tracking-normal text-foreground">cine<span className="text-cinema-red-bright">book</span></span>
        </Link>
        <nav className="hidden items-center gap-7 sm:flex" aria-label="Main navigation">
          {navLinks.map((item) => <Link key={item.label} to={item.to} activeProps={{ className: "text-foreground" }} inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }} className={`text-[13px] font-medium transition-colors ${active === item.label ? "text-foreground" : ""}`}>{item.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <Link to="/admin"><Button variant="ghost" size="sm" className="text-muted-foreground">Admin</Button></Link>
          <Link to="/login"><Button variant="outline" size="sm" className="border-cinema-line px-4">Sign in</Button></Link>
        </div>
        <Button variant="ghost" size="icon" className="sm:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button>
      </div>
      {menuOpen && <nav className="absolute left-0 right-0 top-full border-b border-cinema-line bg-cinema-panel p-3 shadow-xl sm:hidden" aria-label="Mobile navigation"><div className="grid gap-1">{navLinks.map((item) => <Link key={item.label} to={item.to} onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 text-sm text-foreground hover:bg-accent">{item.label}</Link>)}<Link to="/login" className="rounded-md px-3 py-3 text-sm text-foreground hover:bg-accent">Sign in</Link><Link to="/admin" className="rounded-md px-3 py-3 text-sm text-foreground hover:bg-accent">Admin dashboard</Link></div></nav>}
    </header>
  );
}

function Footer() {
  return <footer className="border-t border-cinema-line px-4 py-7 text-sm text-muted-foreground"><div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Link to="/" className="flex items-center gap-2 font-semibold text-foreground"><Ticket size={16} className="text-cinema-red" /> cinebook</Link><p>Movies feel better together.</p><p>© 2026 CineBook · Demo experience</p></div></footer>;
}

function PageFrame({ children, active, className = "" }: { children: React.ReactNode; active?: string | undefined; className?: string }) {
  return <div className="cinema-shell min-h-screen bg-background text-foreground"><Header active={active} /><main className={`mx-auto min-h-[calc(100vh-132px)] max-w-7xl px-4 pb-16 pt-6 sm:px-7 sm:pt-9 lg:px-10 ${className}`}>{children}</main><Footer /></div>;
}

function Eyebrow({ children, dot = true }: { children: React.ReactNode; dot?: boolean }) {
  return <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{dot && <span className="size-1.5 rounded-full bg-cinema-red" />}{children}</span>;
}

function SectionHeading({ title, eyebrow, action, to = "/movies" }: { title: string; eyebrow?: string; action?: string; to?: "/movies" }) {
  return <div className="mb-5 flex items-end justify-between gap-4"><div className="min-w-0"><Eyebrow>{eyebrow ?? "On the big screen"}</Eyebrow><h2 className="text-display mt-1.5 text-2xl font-semibold tracking-normal text-foreground sm:text-[27px]">{title}</h2></div>{action && <Link to={to} className="flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{action}<ArrowRight size={15} /></Link>}</div>;
}

function MovieCard({ movie, delay = 0 }: { movie: Movie; delay?: number }) {
  return <article className="group soft-rise min-w-0" style={{ animationDelay: `${delay}ms` }}>
    <Link to="/movies/$id" params={{ id: movie.id }} aria-label={`View ${movie.title}`} className="relative block aspect-[.72] overflow-hidden rounded-md bg-cinema-panel poster-shadow">
      <img src={movie.posterUrl} alt={`${movie.title} poster`} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" />
      <span className="absolute left-2.5 top-2.5 rounded bg-background/75 px-2 py-1 text-[10px] font-semibold text-foreground backdrop-blur">{movie.certification}</span>
      <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded bg-background/85 px-2 py-1 text-xs font-semibold text-foreground backdrop-blur"><Star size={12} className="fill-cinema-gold text-cinema-gold" />{movie.rating.toFixed(1)}</span>
    </Link>
    <div className="pt-3"><Link to="/movies/$id" params={{ id: movie.id }} className="text-display block truncate text-[16px] font-semibold text-foreground transition-colors hover:text-cinema-red-bright">{movie.title}</Link><div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><span className="truncate">{movie.genre.join(" · ")}</span><span className="size-0.5 shrink-0 rounded-full bg-muted-foreground" /><span className="shrink-0">{Math.floor(movie.durationMinutes / 60)}h {movie.durationMinutes % 60}m</span></div><div className="mt-3"><Link to="/movies/$id" params={{ id: movie.id }}><Button variant="outline" size="sm" className="h-8 w-full border-cinema-line text-xs group-hover:border-cinema-red/60 group-hover:text-foreground">View showtimes <ArrowUpRight size={13} /></Button></Link></div></div>
  </article>;
}

function HomePage() {
  const catalog = useStoredCatalog();
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("all");
  const featured = catalog.movies.find((movie) => movie.featured) ?? catalog.movies[0];
  const nowShowing = catalog.movies.filter((movie) => movie.status === "now-showing");
  const comingSoon = catalog.movies.filter((movie) => movie.status === "coming-soon");
  const visible = useMemo(() => nowShowing.filter((movie) => movie.title.toLowerCase().includes(query.toLowerCase()) && (genre === "all" || movie.genre.includes(genre))), [genre, nowShowing, query]);
  return <PageFrame>
    <section className="relative isolate -mx-4 -mt-6 grid min-h-[500px] overflow-hidden sm:-mx-7 sm:-mt-9 sm:min-h-[530px] lg:-mx-10 lg:min-h-[570px]" aria-labelledby="featured-title">
      {featured && <img src={featured.posterUrl} alt="" fetchPriority="high" width={1920} height={1200} className="absolute inset-0 -z-20 size-full object-cover object-[68%_44%]" />}
      <div className="cinema-hero-scrim absolute inset-0 -z-10 hidden md:block" /><div className="cinema-hero-mobile-scrim absolute inset-0 -z-10 md:hidden" />
      <div className="mx-auto flex w-full max-w-7xl items-end px-4 pb-10 pt-48 sm:px-7 sm:pb-14 md:items-center md:pt-14 lg:px-10"><div className="soft-rise max-w-xl">
        <Eyebrow><span className="text-cinema-red-bright">Now showing</span><span className="mx-1 text-muted-foreground">/</span>Featured premiere</Eyebrow>
        <h1 id="featured-title" className="text-display mt-3 text-5xl font-semibold leading-[0.98] tracking-normal text-foreground sm:text-6xl lg:text-7xl">The Last<br className="hidden sm:block" /> Light</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-foreground/85"><span className="inline-flex items-center gap-1.5 text-cinema-gold"><Star size={14} className="fill-cinema-gold" />8.7</span><span className="size-1 rounded-full bg-foreground/50" /><span>Sci-Fi · Thriller</span><span className="size-1 rounded-full bg-foreground/50" /><span>2h 8m</span><Badge variant="outline" className="rounded-sm border-cinema-line py-0 text-[10px] font-medium">UA 13+</Badge></div>
        <p className="mt-4 max-w-lg text-sm leading-6 text-foreground/75 sm:text-[15px]">A city on the edge of forever. One signal could change everything. Discover the film everyone's talking about.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link to="/movies/$id" params={{ id: featured?.id ?? "last-light" }}><Button className="h-11 gap-2 px-5 font-semibold"><Ticket size={16} />Book tickets<ArrowRight size={15} /></Button></Link><Link to="/movies/$id" params={{ id: featured?.id ?? "last-light" }}><Button variant="secondary" className="h-11 gap-2 border border-cinema-line bg-background/50 px-5 text-foreground backdrop-blur"><Play size={15} />Explore film</Button></Link></div>
        <div className="mt-8 flex items-center gap-2 text-xs text-foreground/70"><MapPin size={13} /><span>Mumbai</span><span className="mx-1 size-1 rounded-full bg-foreground/50"/><span>Showing at 18 cinemas</span><ChevronDown size={13} /></div>
      </div></div>
      <div className="absolute bottom-5 right-5 hidden items-center gap-2 text-xs text-foreground/70 md:flex"><span className="size-1.5 rounded-full bg-cinema-red-bright" />1 / 4</div>
    </section>
    <section className="border-b border-cinema-line py-6" aria-label="Movie search and filters"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px_auto] sm:items-center">
      <label className="relative block"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search movies by title..." aria-label="Search movies by title" className="h-11 border-cinema-line bg-cinema-panel pl-10 placeholder:text-muted-foreground/80" /></label>
      <Select value={genre} onValueChange={setGenre}><SelectTrigger className="h-11 border-cinema-line bg-cinema-panel" aria-label="Filter by genre"><SlidersHorizontal size={15} className="mr-2 text-muted-foreground"/><SelectValue placeholder="All genres" /></SelectTrigger><SelectContent><SelectItem value="all">All genres</SelectItem>{["Sci-Fi", "Thriller", "Adventure", "Crime"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
      <div className="hidden items-center gap-2 whitespace-nowrap text-xs text-muted-foreground sm:flex"><MapPin size={14} />Mumbai<ChevronDown size={13}/></div>
    </div></section>
    <section className="pt-8"><SectionHeading title="Now showing" eyebrow={`${visible.length} films playing now`} action="View all movies" />{visible.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">{visible.map((movie, index) => <MovieCard key={movie.id} movie={movie} delay={index * 70} />)}</div> : <div className="grid min-h-36 place-items-center rounded-md border border-dashed border-cinema-line text-center"><div><Search className="mx-auto mb-2 text-muted-foreground" size={19}/><p className="text-sm text-muted-foreground">No movies match those filters.</p><Button variant="ghost" size="sm" className="mt-1" onClick={() => { setGenre("all"); setQuery(""); }}>Clear search</Button></div></div>}</section>
    <section className="mt-12 border-t border-cinema-line pt-9"><SectionHeading title="Coming soon" eyebrow="A little something to look forward to" /><div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">{comingSoon.map((movie, index) => <MovieCard key={movie.id} movie={movie} delay={index * 70} />)}</div></section>
    <section className="mt-12 grid gap-4 border-t border-cinema-line pt-8 sm:grid-cols-3"><QuickStat icon={<Film size={16}/>} value="18" label="cinemas across Mumbai"/><QuickStat icon={<Ticket size={16}/>} value="Easy" label="tickets, right on your phone"/><QuickStat icon={<ShieldCheck size={16}/>} value="Secure" label="checkout, every time"/></section>
  </PageFrame>;
}

function QuickStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) { return <div className="flex items-center gap-3 py-2"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-cinema-panel text-cinema-red-bright">{icon}</span><div><span className="text-sm font-semibold text-foreground">{value}</span><span className="ml-2 text-sm text-muted-foreground">{label}</span></div></div>; }

function MoviesPage() {
  const catalog = useStoredCatalog();
  const [query, setQuery] = useState(""); const [genre, setGenre] = useState("all"); const [language, setLanguage] = useState("all"); const [rating, setRating] = useState("all"); const [status, setStatus] = useState<"all" | "now-showing" | "coming-soon">("all");
  const visible = catalog.movies.filter((movie) => (status === "all" || movie.status === status) && movie.title.toLowerCase().includes(query.toLowerCase()) && (genre === "all" || movie.genre.includes(genre)) && (language === "all" || movie.language === language) && (rating === "all" || movie.rating >= Number(rating)));
  return <PageFrame active="Movies"><div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><Eyebrow>Find your next favourite</Eyebrow><h1 className="text-display mt-2 text-4xl font-semibold">All movies</h1><p className="mt-2 text-sm text-muted-foreground">The big screen is calling.</p></div><div className="flex flex-wrap gap-2"><Button variant={status === "all" ? "default" : "outline"} size="sm" onClick={() => setStatus("all")}>All movies</Button><Button variant={status === "now-showing" ? "default" : "outline"} size="sm" onClick={() => setStatus("now-showing")}>Now showing</Button><Button variant={status === "coming-soon" ? "default" : "outline"} size="sm" onClick={() => setStatus("coming-soon")}>Coming soon</Button></div></div>
    <div className="mb-7 grid gap-3 sm:grid-cols-[minmax(0,1fr)_repeat(3,minmax(140px,180px))]"><label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search movies" placeholder="Search movies..." className="border-cinema-line bg-cinema-panel pl-9"/></label><FilterSelect label="Genre" value={genre} onChange={setGenre} values={["Sci-Fi", "Thriller", "Adventure", "Crime", "Animation"]}/><FilterSelect label="Language" value={language} onChange={setLanguage} values={["English"]}/><Select value={rating} onValueChange={setRating}><SelectTrigger aria-label="Minimum rating" className="border-cinema-line bg-cinema-panel"><Star size={14} className="mr-2 text-cinema-gold"/><SelectValue placeholder="Any rating"/></SelectTrigger><SelectContent><SelectItem value="all">Any rating</SelectItem><SelectItem value="7">7.0 and up</SelectItem><SelectItem value="8">8.0 and up</SelectItem><SelectItem value="8.5">8.5 and up</SelectItem></SelectContent></Select></div>
    {catalog.error && <ErrorNotice message={catalog.error}/>}<p className="mb-4 text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? "film" : "films"}{status === "all" ? "" : ` · ${status === "coming-soon" ? "Coming soon" : "Now showing"}`}</p>{visible.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">{visible.map((movie, index) => <MovieCard key={movie.id} movie={movie} delay={index * 50}/>)}</div> : <EmptyState icon={<Search size={20}/>} title="Nothing on this screen" text="Try a different search or filter." onAction={() => { setQuery(""); setGenre("all"); setLanguage("all"); setRating("all"); setStatus("all"); }}/>}</PageFrame>;
}

function FilterSelect({ label, value, onChange, values }: { label: string; value: string; onChange: (value: string) => void; values: string[] }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="border-cinema-line bg-cinema-panel"><SelectValue placeholder={label}/></SelectTrigger><SelectContent><SelectItem value="all">All {label.toLowerCase()}s</SelectItem>{values.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>;
}

function MoviePage({ id }: { id: string }) {
  const catalog = useStoredCatalog();
  const movie = catalog.movies.find((entry) => entry.id === id) ?? getSeededMovie(id);
  if (!movie) return <NotFound />;
  const movieShows = catalog.showtimes.filter((showtime) => showtime.movieId === movie.id);
  return <PageFrame active="Movies"><Link to="/movies" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15}/>All movies</Link><div className="grid gap-8 md:grid-cols-[minmax(220px,300px)_minmax(0,1fr)] md:gap-12"><div className="mx-auto w-full max-w-[270px] md:mx-0 md:max-w-none"><img src={movie.posterUrl} alt={`${movie.title} poster`} width={768} height={1024} className="poster-shadow aspect-[.72] w-full rounded-md object-cover"/></div><div className="min-w-0"><Eyebrow>{movie.status === "now-showing" ? "Now showing" : "Coming soon"}</Eyebrow><h1 className="text-display mt-2 text-4xl font-semibold sm:text-5xl">{movie.title}</h1><div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1.5 text-cinema-gold"><Star size={14} className="fill-cinema-gold"/>{movie.rating.toFixed(1)} audience score</span><span>·</span><span>{movie.genre.join(" · ")}</span><span>·</span><span>{movie.durationMinutes} min</span><Badge variant="outline" className="border-cinema-line">{movie.certification}</Badge></div><p className="mt-6 max-w-2xl text-[15px] leading-7 text-muted-foreground">{movie.synopsis}</p><div className="mt-7 grid max-w-xl grid-cols-2 gap-y-5 border-y border-cinema-line py-5 sm:grid-cols-4"><DetailFact label="Language" value={movie.language} icon={<Languages size={15}/>} /><DetailFact label="Duration" value={`${Math.floor(movie.durationMinutes / 60)}h ${movie.durationMinutes % 60}m`} icon={<Clock3 size={15}/>} /><DetailFact label="Release date" value={movie.releaseDate} icon={<CalendarDays size={15}/>} /><DetailFact label="Certification" value={movie.certification} icon={<ShieldCheck size={15}/>} /></div><div className="mt-6"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Starring</p><p className="mt-2 text-sm text-foreground">{movie.cast.join(" · ")}</p></div></div></div>
    <section className="mt-12 border-t border-cinema-line pt-8"><SectionHeading title="Choose a showtime" eyebrow="Today · Mumbai" />{movieShows.length ? <div className="grid gap-4">{movieShows.map((showtime) => <ShowtimeRow key={showtime.id} showtime={showtime}/>)}</div> : <div className="rounded-md border border-cinema-line bg-cinema-panel p-6 text-sm text-muted-foreground">Showtimes are not available yet. Check back soon.</div>}</section>
  </PageFrame>;
}

function DetailFact({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <div className="flex gap-2.5"><span className="mt-0.5 text-cinema-red-bright">{icon}</span><div><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium text-foreground">{value}</p></div></div>; }

function ShowtimeRow({ showtime }: { showtime: Showtime }) { return <div className="grid gap-4 border-b border-cinema-line py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><div className="flex items-center gap-2"><MapPin size={15} className="shrink-0 text-cinema-red-bright"/><p className="truncate text-sm font-semibold text-foreground">{showtime.cinema}</p></div><p className="mt-1 pl-[23px] text-xs text-muted-foreground">{showtime.screen} <span className="mx-1">·</span> {showtime.format}</p></div><div className="flex min-w-0 flex-wrap items-center gap-2">{[showtime.time].map((time) => <Link key={time} to="/showtimes/$id/seats" params={{ id: showtime.id }}><Button variant="outline" size="sm" className="h-9 border-cinema-line px-3 text-xs hover:border-cinema-red hover:text-foreground">{time}<ArrowUpRight size={13}/></Button></Link>)}<span className="ml-1 text-xs text-muted-foreground">from ₹{showtime.standardPrice}</span></div></div>; }

function SeatsPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const catalog = useStoredCatalog();
  const showtime = catalog.showtimes.find((entry) => entry.id === id) ?? getSeededShowtime(id);
  const movie = showtime ? catalog.movies.find((entry) => entry.id === showtime.movieId) ?? getSeededMovie(showtime.movieId) : undefined;
  const [inventory, setInventory] = useState<Seat[]>([]); const [loadingSeats, setLoadingSeats] = useState(true);
  const [selected, setSelected] = useState<string[]>([]); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState("");
  const refreshSeats = async () => {
    if (!showtime) return;
    try {
      const latest = await seatService.forShowtime(showtime.id);
      setInventory(latest);
      setSelected((current) => current.filter((seatId) => latest.some((seat) => seat.id === seatId && seat.status === "available")));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoadingSeats(false);
    }
  };
  useEffect(() => {
    void refreshSeats();
  }, [id, showtime?.id]);
  if (!showtime || !movie) return <NotFound />;
  const chosenSeats = inventory.filter((seat) => selected.includes(seat.id));
  const total = chosenSeats.reduce((sum, seat) => sum + (seat.category === "premium" ? showtime.premiumPrice : showtime.standardPrice), 0);
  const toggleSeat = (seat: Seat) => { if (seat.status === "booked") return; setSelected((current) => current.includes(seat.id) ? current.filter((seatId) => seatId !== seat.id) : current.length < 8 ? [...current, seat.id] : current); setError(""); };
  const continueToBooking = async () => {
    if (!selected.length) return;
    setSubmitting(true); setError("");
    try { const booking = await bookingService.create({ showtimeId: showtime.id, seats: selected }); await navigate({ to: "/booking/$id", params: { id: booking.id } }); }
    catch (requestError) { setError(getApiErrorMessage(requestError)); await refreshSeats(); }
    finally { setSubmitting(false); }
  };
  const rows = [...new Set(inventory.map((seat) => seat.row))];
  return <PageFrame><Link to="/movies/$id" params={{ id: movie.id }} className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15}/>Back to showtimes</Link><div className="mb-7 grid gap-4 border-b border-cinema-line pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><div><Eyebrow>Pick your seats</Eyebrow><h1 className="text-display mt-2 text-3xl font-semibold">{movie.title}</h1><p className="mt-2 text-sm text-muted-foreground">{showtime.cinema} <span className="mx-1">·</span>{showtime.screen}</p></div><div className="text-left sm:text-right"><p className="text-sm font-medium text-foreground">{showtime.date} <span className="mx-1 text-muted-foreground">·</span>{showtime.time}</p><p className="mt-1 text-xs text-muted-foreground">{showtime.format} · {showtime.language}</p></div></div>
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]"><section className="min-w-0 rounded-md border border-cinema-line bg-cinema-panel px-3 py-7 sm:px-8 sm:py-9"><div className="mx-auto mb-9 max-w-[570px]"><div className="mb-3 flex justify-center"><div className="w-[76%] border-t-2 border-cinema-red/80 pt-2 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Screen</div></div>{loadingSeats ? <p className="py-8 text-center text-sm text-muted-foreground">Checking live demo seat availability…</p> : <div className="grid gap-2.5 sm:gap-3">{rows.map((row) => <div key={row} className="grid grid-cols-[16px_minmax(0,1fr)] items-center gap-2"><span className="text-[10px] text-muted-foreground">{row}</span><div className="grid grid-cols-12 gap-1.5 sm:gap-2">{inventory.filter((seat) => seat.row === row).map((seat) => <SeatButton key={seat.id} seat={seat} selected={selected.includes(seat.id)} onClick={() => toggleSeat(seat)}/>)}</div></div>)}</div>}</div><div className="mx-auto flex max-w-lg flex-wrap justify-center gap-x-4 gap-y-2 border-t border-cinema-line pt-5 text-[11px] text-muted-foreground"><SeatLegend className="bg-cinema-raised" label="Available"/><SeatLegend className="bg-cinema-red" label="Selected"/><SeatLegend className="bg-muted-foreground/40" label="Booked / unavailable"/><SeatLegend className="border border-cinema-gold/70 bg-cinema-gold/10" label="Premium available"/></div></section>
      <aside className="h-fit rounded-md border border-cinema-line bg-cinema-panel p-5"><p className="text-sm font-semibold text-foreground">Your selection</p><p className="mt-1 text-xs text-muted-foreground">{selected.length} of 8 seats selected</p><div className="my-4 flex min-h-10 flex-wrap content-start gap-1.5">{chosenSeats.length ? chosenSeats.map((seat) => <Badge key={seat.id} variant="secondary" className="rounded-sm bg-cinema-raised text-xs">{seat.id}</Badge>) : <span className="self-center text-xs text-muted-foreground">Choose a seat to begin</span>}</div><div className="space-y-2 border-t border-cinema-line pt-4 text-sm"><PriceRow label="Standard" price={showtime.standardPrice}/><PriceRow label="Premium" price={showtime.premiumPrice}/><div className="flex justify-between pt-2 font-semibold text-foreground"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div></div>{error && <ErrorNotice message={error}/>}<Button onClick={continueToBooking} disabled={!selected.length || submitting || loadingSeats} className="mt-5 h-11 w-full">{submitting ? "Connecting…" : "Continue"}<ArrowRight size={15}/></Button><p className="mt-3 text-center text-[10px] leading-4 text-muted-foreground">Availability is read and rechecked from this browser's LocalStorage.</p></aside></div>
  </PageFrame>;
}

function SeatButton({ seat, selected, onClick }: { seat: Seat; selected: boolean; onClick: () => void }) { return <button type="button" aria-label={`Seat ${seat.id}, ${seat.status === "booked" ? "booked" : selected ? "selected" : seat.category}`} aria-pressed={selected} disabled={seat.status === "booked"} onClick={onClick} className={`aspect-square min-w-0 rounded-[4px] text-[8px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-[9px] ${seat.status === "booked" ? "cursor-not-allowed bg-muted-foreground/30 text-muted-foreground/60" : selected ? "bg-cinema-red text-primary-foreground" : seat.category === "premium" ? "border border-cinema-gold/70 bg-cinema-gold/10 text-cinema-gold hover:bg-cinema-gold/25" : "bg-cinema-raised text-muted-foreground hover:bg-cinema-red/50 hover:text-foreground"}`}>{seat.number}</button>; }
function SeatLegend({ className, label }: { className: string; label: string }) { return <span className="inline-flex items-center gap-1.5"><span className={`size-2.5 rounded-[3px] ${className}`}/>{label}</span>; }
function PriceRow({ label, price }: { label: string; price: number }) { return <div className="flex justify-between text-xs text-muted-foreground"><span>{label} / seat</span><span>₹{price}</span></div>; }

function BookingPage({ id }: { id: string }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [ticket, setTicket] = useState<TicketView | null>(null);
  const [qrCode, setQrCode] = useState("");
  const [qrScanned, setQrScanned] = useState(false);
  const [demoCardNumber, setDemoCardNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingQr, setLoadingQr] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setTicket(null);
    void bookingService.get(id)
      .then((result) => { if (active) setBooking(result); })
      .catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!booking || booking.status !== "pending" || method !== "upi") {
      setQrCode("");
      return;
    }
    let active = true;
    setLoadingQr(true);
    void generateDemoUPIQRCode(booking.code, booking.amount)
      .then((result) => {
        if (!active) return;
        if (result.success) setQrCode(result.data);
        else setError(result.error.message);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getApiErrorMessage(requestError));
      })
      .finally(() => { if (active) setLoadingQr(false); });
    return () => { active = false; };
  }, [booking?.id, booking?.amount, booking?.code, booking?.status, method]);

  useEffect(() => {
    if (!booking || booking.status !== "confirmed" || booking.paymentStatus !== "success") return;
    let active = true;
    void ticketService.getByBookingId(booking.id)
      .then((result) => { if (active) setTicket(result); })
      .catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError)); });
    return () => { active = false; };
  }, [booking?.id, booking?.status, booking?.paymentStatus]);

  const chooseMethod = (nextMethod: PaymentMethod) => {
    setMethod(nextMethod);
    setQrScanned(false);
    setError("");
  };

  const pay = async () => {
    if (!booking) return;
    setPaying(true);
    setError("");
    try {
      const result = await bookingService.simulatePayment(booking.id, {
        method,
        ...(method === "upi" ? { qrScanned } : { demoCardNumber }),
      });
      setBooking(result);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setPaying(false);
    }
  };

  return <PageFrame><Link to="/my-bookings" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15}/>My bookings</Link>{loading ? <LoadingState title="Finding your booking…"/> : booking ? <div className="mx-auto max-w-2xl"><Eyebrow>{booking.status === "confirmed" ? "Booking confirmed" : "Booking details"}</Eyebrow><h1 className="text-display mt-2 text-4xl font-semibold">{booking.status === "confirmed" ? "You're going to the movies." : "Complete your booking"}</h1><div className="mt-7 rounded-md border border-cinema-line bg-cinema-panel p-5 sm:p-7"><div className="flex gap-4"><img src={booking.movie.posterUrl} alt={`${booking.movie.title} poster`} className="h-28 w-20 shrink-0 rounded object-cover"/><div className="min-w-0"><h2 className="text-display truncate text-xl font-semibold">{booking.movie.title}</h2><p className="mt-2 text-sm text-muted-foreground">{booking.showtime.cinema}</p><p className="mt-1 text-xs text-muted-foreground">{booking.showtime.date} · {booking.showtime.time} · {booking.showtime.screen}</p><div className="mt-2 flex flex-wrap gap-1.5">{booking.seats.map((seat) => <Badge key={seat} variant="secondary" className="rounded-sm bg-cinema-raised">{seat}</Badge>)}</div></div></div><div className="my-5 border-t border-cinema-line"/><div className="flex justify-between text-sm"><span className="text-muted-foreground">Total amount</span><span className="font-semibold">₹{booking.amount.toLocaleString("en-IN")}</span></div><div className="mt-3 flex items-center justify-between text-sm"><span className="text-muted-foreground">Booking status</span><span className="capitalize text-foreground">{booking.status}</span></div><div className="mt-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">Payment status</span><span className="capitalize text-foreground">{booking.paymentStatus}</span></div></div>
    {booking.status === "pending" && booking.paymentStatus !== "success" && <section className="mt-6 rounded-md border border-cinema-line bg-cinema-panel p-5"><h2 className="text-sm font-semibold">Demo payment</h2><p className="mt-1 text-xs text-muted-foreground">Simulation only. No money is charged and no real payment credentials are used.</p><div className="mt-4 grid grid-cols-2 gap-2"><Button type="button" variant={method === "upi" ? "default" : "outline"} aria-pressed={method === "upi"} onClick={() => chooseMethod("upi")}>UPI</Button><Button type="button" variant={method === "card" ? "default" : "outline"} aria-pressed={method === "card"} onClick={() => chooseMethod("card")}>Card</Button></div>
      {method === "upi" ? <div className="mt-4 rounded-md border border-cinema-line bg-background p-4 text-center"><p className="text-sm font-medium">Scan the UPI demo QR</p><p className="mt-1 text-xs text-muted-foreground">This QR is for the local simulation only. It cannot transfer money.</p>{loadingQr ? <p className="py-8 text-sm text-muted-foreground">Generating demo QR…</p> : qrCode ? <img src={qrCode} alt="Local UPI demo payment QR code" className="mx-auto mt-3 size-48 rounded bg-white p-2"/> : <p className="py-8 text-xs text-destructive">The demo QR could not be generated.</p>}<p className="mt-2 text-xs text-muted-foreground">Amount: ₹{booking.amount.toLocaleString("en-IN")}</p><Button type="button" variant={qrScanned ? "secondary" : "outline"} className="mt-3 w-full" disabled={!qrCode} onClick={() => setQrScanned(true)}>{qrScanned ? "Demo QR scan confirmed" : "I scanned the demo QR"}</Button></div> : <div className="mt-4"><label className="grid gap-2 text-xs font-medium text-muted-foreground">Demo card number<Input inputMode="numeric" autoComplete="off" maxLength={8} value={demoCardNumber} onChange={(event) => setDemoCardNumber(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="Enter 12345678" className="h-11 border-cinema-line bg-background text-foreground"/></label><p className="mt-2 text-xs text-muted-foreground">Use the demo-only number <strong className="text-foreground">12345678</strong>. Do not enter a real card number, CVV, or bank details.</p></div>}
      <Button onClick={pay} disabled={paying || (method === "upi" ? !qrScanned || !qrCode : demoCardNumber !== "12345678")} className="mt-4 w-full">{paying ? "Processing demo payment…" : method === "upi" ? "Complete UPI demo payment" : "Validate demo card and pay"}<ArrowRight size={15}/></Button>
    </section>}
    {booking.status === "confirmed" && booking.paymentStatus === "success" && <div className="mt-5 rounded-md border border-cinema-green/30 bg-cinema-green/5 p-4"><div className="flex items-start gap-3"><Check size={17} className="mt-0.5 shrink-0 text-cinema-green"/><div><p className="text-sm font-medium text-foreground">Demo booking confirmed</p><p className="mt-1 text-xs text-muted-foreground">Booking code: {booking.code}. Ticket is available below.</p></div></div></div>}
    {ticket && <section aria-label="Local demonstration ticket" className="mt-5 rounded-md border border-cinema-gold/30 bg-cinema-panel p-5"><div className="text-center"><p className="text-xs font-bold uppercase tracking-wide text-cinema-gold">{ticket.demoLabel}</p><img src={ticket.qrDataUrl} alt="Local ticket QR code for demonstration only" className="mx-auto mt-4 size-48 rounded bg-white p-2"/><p className="mt-3 text-sm font-semibold">{ticket.movieTitle}</p><p className="mt-1 text-xs text-muted-foreground">{ticket.cinema} · {ticket.screen}</p><p className="mt-1 text-xs text-muted-foreground">{ticket.date} · {ticket.time} · Seats {ticket.seats.join(", ")}</p><p className="mt-2 text-xs text-muted-foreground">Ticket QR is a local reference, not secure server verification.</p></div></section>}
    {error && <ErrorNotice message={error}/>}<Link to="/my-bookings"><Button variant="outline" className="mt-4 w-full">View my bookings</Button></Link></div> : <div className="mx-auto max-w-xl"><EmptyState icon={<Ticket size={20}/>} title="Booking details unavailable" text={error || "The service has not returned this booking. No ticket has been created."} to="/movies" actionLabel="Browse movies"/><div className="mt-3"><ErrorNotice message={error || "A valid booking must be returned by the cinema service before a ticket can be shown."}/></div></div>}</PageFrame>;
}

function MyBookingsPage() {
  const [items, setItems] = useState<Booking[] | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; void bookingService.mine().then((result) => { if (active) setItems(result); }).catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  return <PageFrame active="My bookings"><div className="mb-7"><Eyebrow>Your cinema nights</Eyebrow><h1 className="text-display mt-2 text-4xl font-semibold">My bookings</h1><p className="mt-2 text-sm text-muted-foreground">Your tickets and upcoming plans.</p></div>{loading ? <LoadingState title="Loading bookings…"/> : items ? items.length ? <div className="grid gap-3">{items.map((booking) => <BookingRow key={booking.id} booking={booking}/>)}</div> : <EmptyState icon={<Ticket size={20}/>} title="No bookings yet" text="Your next movie night is just around the corner." to="/movies" actionLabel="Find a movie"/> : <ErrorPanel message={error} title="Bookings could not be loaded"/>}</PageFrame>;
}

function BookingRow({ booking }: { booking: Booking }) { return <Link to="/booking/$id" params={{ id: booking.id }} className="grid gap-4 rounded-md border border-cinema-line bg-cinema-panel p-4 transition-colors hover:border-cinema-red/50 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center"><img src={booking.movie.posterUrl} alt="" className="hidden h-20 w-14 rounded object-cover sm:block"/><div className="min-w-0"><h2 className="text-display truncate font-semibold">{booking.movie.title}</h2><p className="mt-1 text-xs text-muted-foreground">{booking.showtime.cinema}</p><p className="mt-1 text-xs text-muted-foreground">{booking.showtime.date} · {booking.showtime.time} · {booking.seats.join(", ")}</p></div><div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end"><Badge variant="outline" className="border-cinema-line capitalize">{booking.status}</Badge><span className="text-sm font-semibold">₹{booking.amount.toLocaleString("en-IN")}</span></div></Link>; }

function LoginPage({ register = false }: { register?: boolean }) {
  const [form, setForm] = useState<AuthRequest>({ name: "", email: "", password: "" }); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [notice, setNotice] = useState("");
  const demoAccounts = [
    { label: "Customer demo", email: "customer@cinebook.demo", role: "Browse movies and manage demo bookings" },
    { label: "Administrator demo", email: "admin@cinebook.demo", role: "Manage movies, showtimes, and bookings" },
  ];
  const fillDemoAccount = (email: string) => setForm({ email, password: "Demo123!" });
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(""); setNotice(""); setLoading(true); try { const result = register ? await authService.register(form) : await authService.login(form); setNotice(`Welcome, ${result.user.name}. You're signed in.`); } catch (requestError) { setError(getApiErrorMessage(requestError)); } finally { setLoading(false); } };
  return <PageFrame><div className="mx-auto mt-6 max-w-md"><div className="mb-7"><Eyebrow>{register ? "Join the club" : "Welcome back"}</Eyebrow><h1 className="text-display mt-2 text-4xl font-semibold">{register ? "Create your account" : "Sign in"}</h1><p className="mt-2 text-sm text-muted-foreground">{register ? "Save your plans. Keep your tickets close." : "Your next great movie night is waiting."}</p></div>{!register && <section aria-label="Demo login credentials" className="mb-4 rounded-md border border-cinema-gold/30 bg-cinema-gold/5 p-4"><div className="mb-3"><p className="text-sm font-semibold text-foreground">Demo accounts</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Local demonstration only. Select an account to fill its credentials.</p></div><div className="grid gap-2">{demoAccounts.map((account) => <button key={account.email} type="button" onClick={() => fillDemoAccount(account.email)} className="flex flex-col gap-1 rounded border border-cinema-line bg-background px-3 py-2.5 text-left transition-colors hover:border-cinema-gold/60"><span className="text-xs font-semibold text-foreground">{account.label}</span><span className="text-xs text-muted-foreground">{account.email}</span><span className="text-[11px] text-muted-foreground">{account.role}</span><span className="text-[11px] text-cinema-gold">Password: Demo123!</span></button>)}</div><p className="mt-3 text-[10px] leading-4 text-muted-foreground">Demo credentials are public by design and are not secure accounts. Do not use them for real services.</p></section>}<form onSubmit={submit} className="grid gap-4 rounded-md border border-cinema-line bg-cinema-panel p-5 sm:p-6">{register && <label className="grid gap-2 text-xs font-medium text-muted-foreground">Name<Input autoComplete="name" required value={form.name ?? ""} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" className="h-11 border-cinema-line bg-background text-foreground"/></label>}<label className="grid gap-2 text-xs font-medium text-muted-foreground">Email<Input type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" className="h-11 border-cinema-line bg-background text-foreground"/></label><label className="grid gap-2 text-xs font-medium text-muted-foreground">Password<Input type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" className="h-11 border-cinema-line bg-background text-foreground"/></label>{error && <ErrorNotice message={error} />}{notice && <p role="status" className="rounded-md border border-cinema-green/30 bg-cinema-green/5 p-3 text-sm text-cinema-green">{notice}</p>}<Button type="submit" disabled={loading} className="mt-1 h-11">{loading ? "Connecting…" : register ? "Create account" : "Sign in"}<ArrowRight size={15}/></Button><p className="text-center text-[11px] text-muted-foreground">{register ? "Demo authentication only; never use a real password here." : "Demo authentication stored only in this browser."}</p></form><p className="mt-5 text-center text-sm text-muted-foreground">{register ? "Already have an account?" : "New to CineBook?"} <Link to={register ? "/login" : "/register"} className="font-medium text-foreground hover:text-cinema-red-bright">{register ? "Sign in" : "Create an account"}</Link></p></div></PageFrame>;
}

function AdminHomePage() {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof adminService.dashboard>> | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; void adminService.dashboard().then((data) => { if (active) setDashboard(data); }).catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const sections = [{ label: "Movies", to: "/admin/movies" as const, icon: <Film size={18}/>, note: "Titles & releases" }, { label: "Showtimes", to: "/admin/showtimes" as const, icon: <CalendarDays size={18}/>, note: "Cinemas & schedules" }, { label: "Bookings", to: "/admin/bookings" as const, icon: <Ticket size={18}/>, note: "Customer reservations" }];
  return <PageFrame><div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><Eyebrow>Management</Eyebrow><h1 className="text-display mt-2 text-4xl font-semibold">Admin dashboard</h1><p className="mt-2 text-sm text-muted-foreground">Cinema operations at a glance.</p></div><Badge variant="outline" className="w-fit gap-1.5 border-cinema-gold/30 text-cinema-gold"><ShieldCheck size={12}/>Service authorization required</Badge></div>{error && <ErrorPanel message={error} title="Admin service unavailable"/>}{loading ? <LoadingState title="Loading dashboard…"/> : dashboard && <div className="mb-8 grid gap-3 sm:grid-cols-3"><Metric label="Total movies" value={dashboard.totalMovies.toString()} icon={<Film size={17}/>} /><Metric label="Total bookings" value={dashboard.totalBookings.toString()} icon={<Ticket size={17}/>} /><Metric label="Simulated revenue" value={`₹${dashboard.revenue.toLocaleString("en-IN")}`} icon={<ArrowUpRight size={17}/>} /></div>}<div className="grid gap-3 sm:grid-cols-3">{sections.map((section) => <Link key={section.label} to={section.to} className="group flex items-center justify-between rounded-md border border-cinema-line bg-cinema-panel p-5 transition-colors hover:border-cinema-red/50"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-cinema-raised text-cinema-red-bright">{section.icon}</span><div><h2 className="text-sm font-semibold">{section.label}</h2><p className="mt-1 text-xs text-muted-foreground">{section.note}</p></div></div><ArrowRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-1"/></Link>)}</div>{dashboard?.recentBookings && dashboard.recentBookings.length > 0 && <section className="mt-9"><SectionHeading title="Recent bookings" eyebrow="Latest activity" to="/movies"/><div className="grid gap-2">{dashboard.recentBookings.slice(0, 5).map((booking) => <BookingRow key={booking.id} booking={booking}/>)}</div></section>}<p className="mt-8 text-xs text-muted-foreground">Admin actions and access must be verified by the connected service. This screen alone does not secure management data.</p></PageFrame>;
}

function AdminMoviesPage() {
  const [items, setItems] = useState<Movie[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [genre, setGenre] = useState("Drama");
  const [language, setLanguage] = useState("English");
  const [rating, setRating] = useState("0");
  const [durationMinutes, setDurationMinutes] = useState("120");
  const [certification, setCertification] = useState("U");
  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<Movie["status"]>("coming-soon");

  const loadMovies = async () => {
    try {
      const catalog = await adminService.catalog();
      setItems(catalog.movies);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };
  useEffect(() => { void loadMovies(); }, []);

  const selectPoster = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for the movie poster.");
      return;
    }
    if (file.size > 2_000_000) {
      setError("Movie poster image must be 2 MB or smaller for LocalStorage.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPosterUrl(reader.result);
        setError("");
      } else {
        setError("The movie poster could not be read.");
      }
    };
    reader.onerror = () => setError("The movie poster could not be read.");
    reader.readAsDataURL(file);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await adminService.createMovie({
        title: title.trim(),
        synopsis: synopsis.trim(),
        posterUrl: posterUrl.trim(),
        genre: [genre],
        language: language.trim(),
        rating: Number(rating),
        durationMinutes: Number(durationMinutes),
        certification,
        releaseDate,
        status,
        cast: [],
      });
      await loadMovies();
      setTitle("");
      setSynopsis("");
      setPosterUrl("");
      setGenre("Drama");
      setLanguage("English");
      setRating("0");
      setDurationMinutes("120");
      setCertification("U");
      setReleaseDate(new Date().toISOString().slice(0, 10));
      setStatus("coming-soon");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return <AdminLayout title="Movie management" subtitle="Add films, choose their category, and attach a poster image.">
    <form onSubmit={submit} className="mb-8 grid gap-4 rounded-md border border-cinema-line bg-cinema-panel p-4 sm:grid-cols-2">
      <label className="grid gap-2 text-xs text-muted-foreground">Movie title<Input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Film title" className="border-cinema-line bg-background"/></label>
      <label className="grid gap-2 text-xs text-muted-foreground">Category / genre<select required value={genre} onChange={(event) => setGenre(event.target.value)} className="h-10 rounded-md border border-cinema-line bg-background px-3 text-sm text-foreground">{["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Fantasy", "Horror", "Mystery", "Romance", "Sci-Fi", "Thriller"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="grid gap-2 text-xs text-muted-foreground sm:col-span-2">Synopsis<Input required value={synopsis} onChange={(event) => setSynopsis(event.target.value)} placeholder="Short movie synopsis" className="border-cinema-line bg-background"/></label>
      <label className="grid gap-2 text-xs text-muted-foreground sm:col-span-2">Poster image URL<Input type="url" value={posterUrl.startsWith("data:") ? "" : posterUrl} onChange={(event) => setPosterUrl(event.target.value)} placeholder="https://example.com/poster.jpg" className="border-cinema-line bg-background"/></label>
      <label className="grid gap-2 text-xs text-muted-foreground sm:col-span-2">Or upload a poster image<Input type="file" accept="image/*" onChange={(event) => selectPoster(event.target.files?.[0])} className="border-cinema-line bg-background file:mr-3 file:rounded file:border-0 file:bg-cinema-raised file:px-3 file:py-1.5 file:text-xs file:text-foreground"/></label>
      {posterUrl && <img src={posterUrl} alt="Movie poster preview" className="max-h-56 max-w-40 rounded border border-cinema-line object-cover sm:col-span-2"/>}
      <label className="grid gap-2 text-xs text-muted-foreground">Language<Input required value={language} onChange={(event) => setLanguage(event.target.value)} className="border-cinema-line bg-background"/></label>
      <label className="grid gap-2 text-xs text-muted-foreground">Rating (0–10)<Input type="number" min="0" max="10" step="0.1" required value={rating} onChange={(event) => setRating(event.target.value)} className="border-cinema-line bg-background"/></label>
      <label className="grid gap-2 text-xs text-muted-foreground">Duration (minutes)<Input type="number" min="1" step="1" required value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} className="border-cinema-line bg-background"/></label>
      <label className="grid gap-2 text-xs text-muted-foreground">Certification<select value={certification} onChange={(event) => setCertification(event.target.value)} className="h-10 rounded-md border border-cinema-line bg-background px-3 text-sm text-foreground">{["U", "UA 7+", "UA 13+", "UA 16+", "A"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="grid gap-2 text-xs text-muted-foreground">Release date<Input type="date" required value={releaseDate} onChange={(event) => setReleaseDate(event.target.value)} className="border-cinema-line bg-background"/></label>
      <label className="grid gap-2 text-xs text-muted-foreground">Listing status<select value={status} onChange={(event) => setStatus(event.target.value as Movie["status"])} className="h-10 rounded-md border border-cinema-line bg-background px-3 text-sm text-foreground"><option value="now-showing">Now showing</option><option value="coming-soon">Coming soon</option></select></label>
      <div className="flex items-end"><Button className="w-full" disabled={submitting || !posterUrl.trim()} type="submit"><Plus size={15}/>{submitting ? "Saving…" : "Add movie"}</Button></div>
      <p className="text-[11px] text-muted-foreground sm:col-span-2">Movie details and the poster are saved in this browser's LocalStorage. Keep uploaded images at 2 MB or less.</p>
    </form>
    {error && <ErrorPanel message={error} title="Movie could not be saved"/>}
    <div className="grid gap-2">{items.map((movie) => <div key={movie.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-cinema-line bg-cinema-panel px-4 py-3"><img src={movie.posterUrl} alt={`${movie.title} poster`} className="size-14 rounded object-cover"/><div className="min-w-0"><p className="truncate text-sm font-medium">{movie.title}</p><p className="mt-1 text-xs text-muted-foreground">{movie.genre.join(" · ")} · {movie.language} · {movie.durationMinutes} min</p></div><Badge variant="outline" className="border-cinema-line text-xs">{movie.status === "coming-soon" ? "Coming soon" : "Now showing"}</Badge></div>)}</div>
  </AdminLayout>;
}

function AdminShowtimesPage() {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<{ movies: Movie[]; cinemas: Cinema[]; screens: Screen[]; showtimes: Showtime[] }>({ movies: [], cinemas: [], screens: [], showtimes: [] });
  const [movieId, setMovieId] = useState("");
  const [cinemaId, setCinemaId] = useState("");
  const [screenId, setScreenId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [standardPrice, setStandardPrice] = useState("220");
  const [premiumPrice, setPremiumPrice] = useState("360");
  const selectedCinema = catalog.cinemas.find((cinema) => cinema.id === cinemaId);
  const availableScreens = catalog.screens.filter((screen) => screen.cinemaId === cinemaId);
  const selectedMovie = catalog.movies.find((movie) => movie.id === movieId);

  const loadCatalog = async () => {
    try {
      const result = await adminService.catalog();
      setCatalog(result);
      setMovieId((current) => current || result.movies[0]?.id || "");
      setCinemaId((current) => current || result.cinemas[0]?.id || "");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  };
  useEffect(() => { void loadCatalog(); }, []);
  useEffect(() => {
    if (!availableScreens.some((screen) => screen.id === screenId)) setScreenId(availableScreens[0]?.id ?? "");
  }, [cinemaId, catalog.screens]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMovie || !selectedCinema || !screenId) {
      setError("Choose a movie, cinema, and screen before adding a showtime.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await adminService.createShowtime({
        movieId: selectedMovie.id,
        cinemaId: selectedCinema.id,
        screenId,
        cinema: selectedCinema.name,
        screen: availableScreens.find((screen) => screen.id === screenId)?.name ?? "",
        date,
        time,
        standardPrice: Number(standardPrice),
        premiumPrice: Number(premiumPrice),
        language: selectedMovie.language,
        format: availableScreens.find((screen) => screen.id === screenId)?.format ?? "2D",
      });
      await loadCatalog();
      setTime("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  return <AdminLayout title="Showtime management" subtitle="Select a saved movie, then schedule it in one of its cinema's screens.">
    <form onSubmit={submit} className="mb-8 grid gap-4 rounded-md border border-cinema-line bg-cinema-panel p-4 sm:grid-cols-2">
      <label className="grid gap-2 text-xs text-muted-foreground">Movie<select required value={movieId} onChange={(event) => setMovieId(event.target.value)} className="h-10 rounded-md border border-cinema-line bg-background px-3 text-sm text-foreground"><option value="">Select a movie</option>{catalog.movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title} · {movie.genre.join(", ")}</option>)}</select></label>
      <label className="grid gap-2 text-xs text-muted-foreground">Cinema<select required value={cinemaId} onChange={(event) => setCinemaId(event.target.value)} className="h-10 rounded-md border border-cinema-line bg-background px-3 text-sm text-foreground"><option value="">Select a cinema</option>{catalog.cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name} · {cinema.city} ({cinema.address})</option>)}</select></label>
      <label className="grid gap-2 text-xs text-muted-foreground">Screen<select required value={screenId} onChange={(event) => setScreenId(event.target.value)} className="h-10 rounded-md border border-cinema-line bg-background px-3 text-sm text-foreground"><option value="">Select a screen</option>{availableScreens.map((screen) => <option key={screen.id} value={screen.id}>{screen.name} · {screen.format}</option>)}</select></label>
      <label className="grid gap-2 text-xs text-muted-foreground">Date<Input type="date" required min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} className="border-cinema-line bg-background"/></label>
      <label className="grid gap-2 text-xs text-muted-foreground">Start time<Input type="time" required value={time} onChange={(event) => setTime(event.target.value)} className="border-cinema-line bg-background"/></label>
      <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-xs text-muted-foreground">Regular seat price<Input type="number" min="0" required value={standardPrice} onChange={(event) => setStandardPrice(event.target.value)} className="border-cinema-line bg-background"/></label><label className="grid gap-2 text-xs text-muted-foreground">Premium seat price<Input type="number" min="0" required value={premiumPrice} onChange={(event) => setPremiumPrice(event.target.value)} className="border-cinema-line bg-background"/></label></div>
      {selectedMovie && <p className="text-xs text-muted-foreground sm:col-span-2">Selected: {selectedMovie.title} · {selectedMovie.genre.join(", ")} · {selectedMovie.language} · {selectedMovie.durationMinutes} minutes</p>}
      <div className="sm:col-span-2"><Button type="submit" disabled={saving || !catalog.movies.length || !availableScreens.length}><Plus size={15}/>{saving ? "Saving…" : "Add showtime for selected movie"}</Button></div>
    </form>
    {error && <ErrorPanel message={error} title="Showtime could not be saved"/>}
    <div className="grid gap-3">{catalog.showtimes.map((showtime) => {
      const movie = catalog.movies.find((entry) => entry.id === showtime.movieId);
      return <div key={showtime.id} className="grid gap-3 rounded-md border border-cinema-line bg-cinema-panel p-4 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:items-center"><img src={movie?.posterUrl} alt={movie ? `${movie.title} poster` : ""} className="size-14 rounded object-cover"/><div><p className="text-sm font-semibold">{movie?.title ?? "Unknown movie"} · {movie?.genre.join(", ")}</p><p className="mt-1 text-xs text-muted-foreground">{showtime.cinema} · {showtime.screen}</p><p className="mt-1 text-xs text-muted-foreground">{showtime.date} · {showtime.time} · Regular ₹{showtime.standardPrice} · Premium ₹{showtime.premiumPrice}</p></div><Badge variant="outline" className="border-cinema-line">{showtime.format}</Badge></div>;
    })}</div>
  </AdminLayout>;
}

function AdminBookingsPage() {
  const [items, setItems] = useState<Booking[] | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true); const [query, setQuery] = useState("");
  useEffect(() => { let active = true; void adminService.bookings().then((result) => { if (active) setItems(result); }).catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const filtered = items?.filter((booking) => `${booking.id} ${booking.movie.title} ${booking.status} ${booking.paymentStatus}`.toLowerCase().includes(query.toLowerCase()));
  return <AdminLayout title="Booking management" subtitle="Review reservations and payment states."><label className="relative mb-5 block max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ID, movie, status..." aria-label="Search bookings" className="border-cinema-line bg-cinema-panel pl-9"/></label>{loading ? <LoadingState title="Loading bookings…"/> : error ? <ErrorPanel message={error} title="Bookings could not be loaded"/> : filtered?.length ? <div className="grid gap-2">{filtered.map((booking) => <BookingRow key={booking.id} booking={booking}/>)}</div> : <EmptyState icon={<Ticket size={20}/>} title="No matching bookings" text="No booking records were returned."/>}</AdminLayout>;
}

function AdminLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <PageFrame><Link to="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15}/>Dashboard</Link><div className="mb-7"><Eyebrow>Admin · Operations</Eyebrow><h1 className="text-display mt-2 text-4xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{subtitle}</p></div><div className="mb-5 flex flex-wrap gap-2"><Link to="/admin/movies"><Button variant="outline" size="sm">Movies</Button></Link><Link to="/admin/showtimes"><Button variant="outline" size="sm">Showtimes</Button></Link><Link to="/admin/bookings"><Button variant="outline" size="sm">Bookings</Button></Link></div>{children}</PageFrame>; }

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) { return <div className="rounded-md border border-cinema-line bg-cinema-panel p-5"><div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">{label}</span>{icon}</div><p className="text-display mt-4 text-3xl font-semibold">{value}</p></div>; }
function LoadingState({ title }: { title: string }) { return <div role="status" className="flex min-h-40 items-center justify-center gap-3 text-sm text-muted-foreground"><span className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-cinema-red"/>{title}</div>; }
function ErrorNotice({ message }: { message: string }) { return <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs leading-5 text-destructive"><CircleAlert size={15} className="mt-0.5 shrink-0"/><span>{message}</span></div>; }
function ErrorPanel({ message, title }: { message: string; title: string }) { return <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-5"><div className="flex gap-3"><CircleAlert size={18} className="mt-0.5 shrink-0 text-destructive"/><div><h2 className="text-sm font-semibold text-foreground">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{message}</p></div></div></div>; }
function EmptyState({ icon, title, text, to, actionLabel, onAction }: { icon: React.ReactNode; title: string; text: string; to?: "/movies"; actionLabel?: string; onAction?: () => void }) { return <div className="grid min-h-56 place-items-center rounded-md border border-cinema-line bg-cinema-panel/60 p-6 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-full bg-cinema-raised text-muted-foreground">{icon}</span><h2 className="text-display mt-4 text-xl font-semibold">{title}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{text}</p>{to && actionLabel && <Link to={to}><Button className="mt-5">{actionLabel}<ArrowRight size={15}/></Button></Link>}{onAction && <Button variant="outline" className="mt-5" onClick={onAction}>Clear filters<ArrowDownRight size={15}/></Button>}</div></div>; }
function NotFound() { return <PageFrame><EmptyState icon={<Film size={20}/>} title="This film isn't on our list" text="It may have moved, or the showtime is no longer available." to="/movies" actionLabel="Browse movies"/></PageFrame>; }

export { HomePage, MoviesPage, MoviePage, SeatsPage, BookingPage, MyBookingsPage, LoginPage, AdminHomePage, AdminMoviesPage, AdminShowtimesPage, AdminBookingsPage };