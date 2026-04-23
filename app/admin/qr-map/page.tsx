"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "../../../lib/supabase/client";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string | null;
  is_admin: boolean | null;
};

type OverviewRow = {
  total_locations: number | string | null;
  total_qrs: number | string | null;
  placed_qrs: number | string | null;
  planned_qrs: number | string | null;
  total_scans: number | string | null;
  total_signups: number | string | null;
  total_subscriptions: number | string | null;
  locations_with_scans: number | string | null;
  locations_with_signups: number | string | null;
  locations_with_subscriptions: number | string | null;
  stalled_locations: number | string | null;
  scan_to_signup_rate: number | string | null;
  signup_to_subscription_rate: number | string | null;
  scan_to_subscription_rate: number | string | null;
};

type LocationRow = {
  location_key: string | null;
  station_group_id: string | null;
  site_number: number | string | null;
  business_name: string | null;
  location_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  campaign: string | null;
  venue_type: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  status: string | null;
  qr_count: number | string | null;
  total_scans: number | string | null;
  total_signups: number | string | null;
  total_subscriptions: number | string | null;
  scan_to_signup_rate: number | string | null;
  signup_to_subscription_rate: number | string | null;
  scan_to_subscription_rate: number | string | null;
  placed_qr_count: number | string | null;
  planned_qr_count: number | string | null;
  created_at: string | null;
  placed_at: string | null;
  performance_band: string | null;
};

type PerformanceBand =
  | "all"
  | "high_performer"
  | "strong_signup"
  | "getting_attention"
  | "low_activity"
  | "stalled";

const NC_CENTER: [number, number] = [35.5, -79.0];
const NC_DEFAULT_ZOOM = 7;
const NC_BOUNDS_SW: [number, number] = [33.8, -84.5];
const NC_BOUNDS_NE: [number, number] = [36.7, -75.3];

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }

    const maybeDetails = (error as { details?: unknown }).details;
    if (typeof maybeDetails === "string" && maybeDetails.trim()) {
      return maybeDetails;
    }

    const maybeHint = (error as { hint?: unknown }).hint;
    if (typeof maybeHint === "string" && maybeHint.trim()) {
      return maybeHint;
    }
  }

  return "Unknown error.";
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US").format(toNumber(value));
}

function formatPercent(value: number | string | null | undefined) {
  return `${toNumber(value).toFixed(2)}%`;
}

function getDisplayName(profile: {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  email?: string | null;
}) {
  const first = profile.first_name?.trim() ?? "";
  const last = profile.last_name?.trim() ?? "";
  const full = `${first} ${last}`.trim();

  if (full) return full;
  if (profile.username?.trim()) return `@${profile.username.trim()}`;
  if (profile.email?.trim()) return profile.email.trim();

  return "Admin";
}

function bandLabel(band: string | null | undefined) {
  const normalized = (band ?? "").trim().toLowerCase();

  if (normalized === "high_performer") return "High performer";
  if (normalized === "strong_signup") return "Strong signup";
  if (normalized === "getting_attention") return "Getting attention";
  if (normalized === "low_activity") return "Low activity";
  if (normalized === "stalled") return "Stalled";

  return "Unknown";
}

function getPerformanceColor(band: string | null | undefined) {
  const normalized = (band ?? "").trim().toLowerCase();

  if (normalized === "high_performer") return "#22c55e";
  if (normalized === "strong_signup") return "#60a5fa";
  if (normalized === "getting_attention") return "#f59e0b";
  if (normalized === "low_activity") return "#a78bfa";
  if (normalized === "stalled") return "#ef4444";

  return "#94a3b8";
}

function getMarkerColor(row: LocationRow) {
  const status = (row.status ?? "").trim().toLowerCase();

  if (status === "planned") return "#94a3b8";
  if (status === "placed") return getPerformanceColor(row.performance_band);

  return "#64748b";
}

function bandPillStyles(band: string | null | undefined) {
  const color = getPerformanceColor(band);

  return {
    color,
    border: `1px solid ${color}33`,
    background: `${color}1a`,
  };
}

function markerRadius(row: LocationRow) {
  const subscriptions = toNumber(row.total_subscriptions);
  const signups = toNumber(row.total_signups);
  const scans = toNumber(row.total_scans);

  if (subscriptions >= 5) return 16;
  if (subscriptions >= 1) return 13;
  if (signups >= 5) return 12;
  if (signups >= 1) return 10;
  if (scans >= 10) return 9;
  if (scans >= 1) return 8;

  return 7;
}

function safePopupId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMarkerHtml(color: string, size: number) {
  return `
    <div
      style="
        width:${size * 2}px;
        height:${size * 2}px;
        display:flex;
        align-items:center;
        justify-content:center;
      "
    >
      <div
        style="
          width:${size * 2 - 2}px;
          height:${size * 2 - 2}px;
          border-radius:999px;
          background:${color};
          border:2px solid rgba(255,255,255,0.95);
          box-shadow:0 3px 12px rgba(2,8,23,0.35);
        "
      ></div>
    </div>
  `;
}

function MetricPill({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "999px",
        padding: "18px 20px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "rgba(255,255,255,0.62)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "28px",
          fontWeight: 800,
          lineHeight: 1,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: "8px",
          color: "rgba(255,255,255,0.68)",
          fontSize: "13px",
          lineHeight: 1.45,
        }}
      >
        {subtext}
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "16px",
        fontSize: "14px",
        color: "rgba(255,255,255,0.86)",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.66)" }}>{label}</span>
      <span style={{ fontWeight: 700, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default function AdminQrMapPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminName, setAdminName] = useState("Admin");
  const [adminEmail, setAdminEmail] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const [overview, setOverview] = useState<OverviewRow | null>(null);
  const [locations, setLocations] = useState<LocationRow[]>([]);

  const [selectedBand, setSelectedBand] = useState<PerformanceBand>("all");
  const [selectedCity, setSelectedCity] = useState("all");

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const leafletCss = document.getElementById("ssc-leaflet-css");
    if (!leafletCss) {
      const link = document.createElement("link");
      link.id = "ssc-leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const markerClusterCss = document.getElementById("ssc-markercluster-css");
    if (!markerClusterCss) {
      const link = document.createElement("link");
      link.id = "ssc-markercluster-css";
      link.rel = "stylesheet";
      link.href =
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
      document.head.appendChild(link);
    }

    const markerClusterDefaultCss = document.getElementById(
      "ssc-markercluster-default-css"
    );
    if (!markerClusterDefaultCss) {
      const link = document.createElement("link");
      link.id = "ssc-markercluster-default-css";
      link.rel = "stylesheet";
      link.href =
        "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        setAdminEmail(user.email ?? "");

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, username, email, is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw new Error(`Profile read failed: ${getErrorMessage(profileError)}`);
        }

        const profile = profileData as ProfileRow | null;
        const isAdmin = profile?.is_admin === true;

        if (!isAdmin) {
          router.replace("/dashboard");
          return;
        }

        setAdminName(
          profile
            ? getDisplayName(profile)
            : (user.user_metadata?.full_name as string | undefined)?.trim() || "Admin"
        );

        setAdminEmail(profile?.email ?? user.email ?? "");

        const overviewRequest = supabase.rpc("admin_qr_overview_metrics");
        const locationRequest = supabase
          .rpc("admin_qr_location_metrics")
          .range(0, 9999);

        const [
          { data: overviewData, error: overviewError },
          { data: locationData, error: locationError },
        ] = await Promise.all([overviewRequest, locationRequest]);

        if (overviewError) {
          throw new Error(`Overview read failed: ${getErrorMessage(overviewError)}`);
        }

        if (locationError) {
          throw new Error(`Location read failed: ${getErrorMessage(locationError)}`);
        }

        setOverview((overviewData?.[0] as OverviewRow | undefined) ?? null);
        setLocations((locationData as LocationRow[]) ?? []);
      } catch (err) {
        console.error("Admin QR map load failed:", err);
        setError(`Something went wrong loading the QR analytics page. ${getErrorMessage(err)}`);
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [router, supabase]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const cityOptions = useMemo(() => {
    return Array.from(
      new Set(
        locations
          .map((row) => (row.city ?? "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [locations]);

  const filteredLocations = useMemo(() => {
    return locations.filter((row) => {
      const bandMatches =
        selectedBand === "all" ||
        (row.performance_band ?? "").trim().toLowerCase() === selectedBand;

      const cityMatches =
        selectedCity === "all" ||
        (row.city ?? "").trim().toLowerCase() === selectedCity.toLowerCase();

      return bandMatches && cityMatches;
    });
  }, [locations, selectedBand, selectedCity]);

  const topPerformers = useMemo(() => {
    return [...locations]
      .sort((a, b) => {
        const subscriptionDiff = toNumber(b.total_subscriptions) - toNumber(a.total_subscriptions);
        if (subscriptionDiff !== 0) return subscriptionDiff;

        const signupDiff = toNumber(b.total_signups) - toNumber(a.total_signups);
        if (signupDiff !== 0) return signupDiff;

        return toNumber(b.total_scans) - toNumber(a.total_scans);
      })
      .slice(0, 8);
  }, [locations]);

  const stalledLocations = useMemo(() => {
    return locations
      .filter((row) => (row.performance_band ?? "").trim().toLowerCase() === "stalled")
      .slice(0, 8);
  }, [locations]);

  useEffect(() => {
    let cancelled = false;

    async function renderMap() {
      if (!mapContainerRef.current || loading) return;

      const validRows = filteredLocations.filter(
        (row) => Number.isFinite(toNumber(row.latitude)) && Number.isFinite(toNumber(row.longitude))
      );

      const leafletModule = await import("leaflet");
      await import("leaflet.markercluster");
      if (cancelled) return;

      const L: any = (leafletModule as any).default ?? leafletModule;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        maxBoundsViscosity: 1.0,
      });

      const ncBounds = L.latLngBounds(NC_BOUNDS_SW, NC_BOUNDS_NE);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      map.setMaxBounds(ncBounds);
      map.setMinZoom(6);
      map.setMaxZoom(18);

      const clusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        removeOutsideVisibleBounds: true,
        maxClusterRadius: 48,
        iconCreateFunction: (cluster: any) => {
          const count = cluster.getChildCount();
          let size = 42;
          let bg = "#1d4ed8";

          if (count >= 100) {
            size = 56;
            bg = "#0f766e";
          } else if (count >= 25) {
            size = 50;
            bg = "#2563eb";
          }

          return L.divIcon({
            html: `
              <div
                style="
                  width:${size}px;
                  height:${size}px;
                  border-radius:999px;
                  background:${bg};
                  border:3px solid rgba(255,255,255,0.92);
                  color:#ffffff;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-weight:800;
                  font-size:14px;
                  box-shadow:0 10px 24px rgba(2,8,23,0.28);
                "
              >
                ${count}
              </div>
            `,
            className: "ssc-cluster-icon",
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        },
      });

      if (validRows.length === 0) {
        map.setView(NC_CENTER, NC_DEFAULT_ZOOM);
        mapRef.current = map;
        return;
      }

      const dataBounds = L.latLngBounds([]);

      validRows.forEach((row) => {
        const lat = toNumber(row.latitude);
        const lng = toNumber(row.longitude);
        const color = getMarkerColor(row);
        const popupKey = safePopupId(
          row.location_key || row.station_group_id || `${lat}-${lng}`
        );
        const detailsId = `ssc-popup-details-${popupKey}`;
        const linkId = `ssc-popup-link-${popupKey}`;
        const radius = markerRadius(row);
        const businessLabel = escapeHtml(
          row.business_name || row.location_name || "—"
        );
        const addressLabel = escapeHtml(row.address || "No address available");
        const cityLabel = escapeHtml(row.city || "—");
        const stateLabel = escapeHtml(row.state || "—");
        const statusLabel = escapeHtml(row.status || "—");
        const campaignLabel = escapeHtml(row.campaign || "—");
        const bandText = escapeHtml(bandLabel(row.performance_band));

        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: buildMarkerHtml(color, radius),
            className: "ssc-pin-icon",
            iconSize: [radius * 2, radius * 2],
            iconAnchor: [radius, radius],
            popupAnchor: [0, -radius],
          }),
          title: row.address || row.business_name || row.location_name || "QR Location",
        });

        const popupHtml = `
          <div style="min-width: 250px; color: #0f172a; font-family: Arial, sans-serif;">
            <div style="font-size: 13px; color: #334155; margin-bottom: 12px; line-height: 1.5;">
              ${addressLabel}
            </div>

            <div style="display: grid; gap: 6px; font-size: 13px; margin-bottom: 10px;">
              <div><strong>Scans:</strong> ${formatNumber(row.total_scans)}</div>
              <div><strong>Signups:</strong> ${formatNumber(row.total_signups)}</div>
              <div><strong>Subscriptions:</strong> ${formatNumber(row.total_subscriptions)}</div>
            </div>

            <a
              href="#"
              id="${linkId}"
              onclick="
                var details = document.getElementById('${detailsId}');
                var link = document.getElementById('${linkId}');
                if (details) details.style.display = 'block';
                if (link) link.style.display = 'none';
                return false;
              "
              style="
                display: inline-block;
                margin-bottom: 10px;
                color: #1d4ed8;
                font-weight: 700;
                text-decoration: none;
                cursor: pointer;
              "
            >
              View more details
            </a>

            <div
              id="${detailsId}"
              style="display: none; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 13px;"
            >
              <div style="display: grid; gap: 6px;">
                <div><strong>Status:</strong> ${statusLabel}</div>
                <div><strong>Business:</strong> ${businessLabel}</div>
                <div><strong>City:</strong> ${cityLabel}</div>
                <div><strong>State:</strong> ${stateLabel}</div>
                <div><strong>Scan → Signup:</strong> ${formatPercent(row.scan_to_signup_rate)}</div>
                <div><strong>Signup → Subscription:</strong> ${formatPercent(
                  row.signup_to_subscription_rate
                )}</div>
                <div><strong>QRs at Location:</strong> ${formatNumber(row.qr_count)}</div>
                <div><strong>Placed QRs:</strong> ${formatNumber(row.placed_qr_count)}</div>
                <div><strong>Planned QRs:</strong> ${formatNumber(row.planned_qr_count)}</div>
                <div><strong>Campaign:</strong> ${campaignLabel}</div>
                <div><strong>Status Band:</strong> ${bandText}</div>
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml, { maxWidth: 320 });
        marker.on("mouseover", () => marker.openPopup());
        marker.on("click", () => marker.openPopup());

        clusterGroup.addLayer(marker);
        dataBounds.extend([lat, lng]);
      });

      map.addLayer(clusterGroup);

      const boundedData = dataBounds.isValid() ? dataBounds.pad(0.12) : ncBounds;
      const combinedBounds = L.latLngBounds(
        [
          Math.max(boundedData.getSouth(), ncBounds.getSouth()),
          Math.max(boundedData.getWest(), ncBounds.getWest()),
        ],
        [
          Math.min(boundedData.getNorth(), ncBounds.getNorth()),
          Math.min(boundedData.getEast(), ncBounds.getEast()),
        ]
      );

      if (combinedBounds.isValid()) {
        map.fitBounds(combinedBounds, { padding: [24, 24] });
      } else {
        map.setView(NC_CENTER, NC_DEFAULT_ZOOM);
      }

      mapRef.current = map;
    }

    renderMap();

    return () => {
      cancelled = true;
    };
  }, [filteredLocations, loading]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #07111f 0%, #0b1728 55%, #101d31 100%)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "460px", textAlign: "center" }}>
          <div
            style={{
              width: "82px",
              height: "82px",
              margin: "0 auto 18px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "999px",
                border: "3px solid rgba(255,255,255,0.22)",
                borderTopColor: "#ffffff",
                animation: "sscSpin 0.9s linear infinite",
              }}
            />
          </div>

          <div style={{ fontSize: "28px", fontWeight: 800, marginBottom: "10px" }}>
            Loading QR analytics...
          </div>

          <div
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.6,
            }}
          >
            Pulling location performance, conversion data, and map pins.
          </div>

          <style jsx>{`
            @keyframes sscSpin {
              from {
                transform: rotate(0deg);
              }
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #07111f 0%, #0b1728 55%, #101d31 100%)",
        color: "#ffffff",
        padding: "32px 20px 60px",
        overflowX: "hidden",
      }}
    >
      <div style={{ maxWidth: "1320px", margin: "0 auto" }}>
        <div
          className="dashboard-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "28px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "14px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#8fb7ff",
                marginBottom: "8px",
              }}
            >
              Secret Scan Club
            </div>

            <h1
              className="dashboard-title"
              style={{
                fontSize: "34px",
                lineHeight: 1.1,
                margin: 0,
                fontWeight: 800,
              }}
            >
              QR Performance Map
            </h1>

            <p
              style={{
                marginTop: "10px",
                marginBottom: 0,
                color: "rgba(255,255,255,0.78)",
                fontSize: "15px",
                wordBreak: "break-word",
                maxWidth: "780px",
              }}
            >
              Welcome back, {adminName}. Track scans, member signups, subscriptions,
              and underperforming locations from one interactive admin view.
            </p>
          </div>

          <div
            className="hero-actions"
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/admin"
              className="hero-action-link"
              style={{
                display: "inline-block",
                background: "transparent",
                color: "#ffffff",
                textDecoration: "none",
                padding: "14px 20px",
                borderRadius: "14px",
                fontWeight: 700,
                fontSize: "15px",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              Back to Admin Dashboard
            </Link>

            <Link
              href="/admin/payouts"
              className="hero-action-link"
              style={{
                display: "inline-block",
                background: "#ffffff",
                color: "#07111f",
                textDecoration: "none",
                padding: "14px 20px",
                borderRadius: "14px",
                fontWeight: 800,
                fontSize: "15px",
              }}
            >
              Open Payout Center
            </Link>

            <button
              className="signout-button"
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                background: "transparent",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "12px",
                padding: "12px 18px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: signingOut ? "not-allowed" : "pointer",
                opacity: signingOut ? 0.7 : 1,
              }}
            >
              {signingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>

        {error ? (
          <div
            style={{
              background: "rgba(255, 87, 87, 0.12)",
              border: "1px solid rgba(255, 87, 87, 0.35)",
              color: "#ffd5d5",
              borderRadius: "14px",
              padding: "14px 16px",
              marginBottom: "20px",
              whiteSpace: "pre-wrap",
            }}
          >
            {error}
          </div>
        ) : null}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: "16px",
            marginBottom: "20px",
          }}
          className="pill-grid"
        >
          <MetricPill
            label="Total Scans"
            value={formatNumber(overview?.total_scans)}
            subtext="All scans from mapped locations"
          />
          <MetricPill
            label="Member Signups"
            value={formatNumber(overview?.total_signups)}
            subtext="Completed signups attributed to locations"
          />
          <MetricPill
            label="Subscriptions"
            value={formatNumber(overview?.total_subscriptions)}
            subtext="Paid conversions attributed to locations"
          />
          <MetricPill
            label="Locations"
            value={formatNumber(overview?.total_locations)}
            subtext="Distinct map pins"
          />
          <MetricPill
            label="Stalled Locations"
            value={formatNumber(overview?.stalled_locations)}
            subtext="Locations currently showing no scan activity"
          />
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "16px",
            marginBottom: "20px",
          }}
          className="pill-grid-secondary"
        >
          <MetricPill
            label="Scan → Signup"
            value={formatPercent(overview?.scan_to_signup_rate)}
            subtext="How many scans become members"
          />
          <MetricPill
            label="Signup → Subscription"
            value={formatPercent(overview?.signup_to_subscription_rate)}
            subtext="How many signups become paid"
          />
          <MetricPill
            label="Placed QRs"
            value={formatNumber(overview?.placed_qrs)}
            subtext="QRs marked placed"
          />
          <MetricPill
            label="Planned QRs"
            value={formatNumber(overview?.planned_qrs)}
            subtext="QRs still marked planned"
          />
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: "20px",
            marginBottom: "20px",
          }}
          className="top-grid"
        >
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "24px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9bbcff",
                marginBottom: "14px",
              }}
            >
              Map Filters
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px",
                marginBottom: "16px",
              }}
              className="filter-grid"
            >
              <select
                value={selectedBand}
                onChange={(e) => setSelectedBand(e.target.value as PerformanceBand)}
                style={{
                  width: "100%",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#132238",
                  color: "#ffffff",
                  outline: "none",
                  fontSize: "14px",
                }}
              >
                <option value="all">All locations</option>
                <option value="high_performer">High performer</option>
                <option value="strong_signup">Strong signup</option>
                <option value="getting_attention">Getting attention</option>
                <option value="low_activity">Low activity</option>
                <option value="stalled">Stalled</option>
              </select>

              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#132238",
                  color: "#ffffff",
                  outline: "none",
                  fontSize: "14px",
                }}
              >
                <option value="all">All cities</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div
              ref={mapContainerRef}
              style={{
                width: "100%",
                height: "560px",
                borderRadius: "18px",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gap: "20px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "22px",
                padding: "24px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#9bbcff",
                  marginBottom: "14px",
                }}
              >
                Live Snapshot
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                <StatRow label="Filtered Locations" value={formatNumber(filteredLocations.length)} />
                <StatRow
                  label="Locations with Scans"
                  value={formatNumber(overview?.locations_with_scans)}
                />
                <StatRow
                  label="Locations with Signups"
                  value={formatNumber(overview?.locations_with_signups)}
                />
                <StatRow
                  label="Locations with Subscriptions"
                  value={formatNumber(overview?.locations_with_subscriptions)}
                />
                <StatRow
                  label="Overall Scan → Subscription"
                  value={formatPercent(overview?.scan_to_subscription_rate)}
                />
              </div>

              <div
                style={{
                  marginTop: "18px",
                  paddingTop: "18px",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.72)",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                Hover or click a map pin to see a quick popup. Use the popup link to expand
                more detail for that location.
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "22px",
                padding: "24px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#9bbcff",
                  marginBottom: "14px",
                }}
              >
                Marker Guide
              </div>

              <div style={{ display: "grid", gap: "10px" }}>
                {[
                  { key: "planned", text: "Locations not yet physically placed" },
                  { key: "high_performer", text: "Best subscription-producing locations" },
                  { key: "strong_signup", text: "Good signup behavior, room to convert higher" },
                  { key: "getting_attention", text: "Getting scans, still early" },
                  { key: "low_activity", text: "Some visibility, weak traction" },
                  { key: "stalled", text: "No scan activity yet" },
                ].map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-start",
                      padding: "12px 14px",
                      borderRadius: "14px",
                      background: "rgba(255,255,255,0.045)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "999px",
                        marginTop: "4px",
                        background:
                          item.key === "planned"
                            ? "#94a3b8"
                            : getPerformanceColor(item.key),
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        fontSize: "14px",
                        color: "rgba(255,255,255,0.82)",
                        lineHeight: 1.55,
                      }}
                    >
                      <strong style={{ color: "#ffffff" }}>
                        {item.key === "planned" ? "Planned" : bandLabel(item.key)}
                      </strong>
                      <br />
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
          className="bottom-grid"
        >
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "24px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9bbcff",
                marginBottom: "14px",
              }}
            >
              Top Performing Locations
            </div>

            {topPerformers.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.72)", fontSize: "15px", lineHeight: 1.6 }}>
                No location performance data available yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {topPerformers.map((row, index) => (
                  <div
                    key={`${row.location_key}-${index}`}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "16px",
                      background: "rgba(255,255,255,0.045)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        alignItems: "flex-start",
                        marginBottom: "8px",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: "15px",
                            marginBottom: "4px",
                            wordBreak: "break-word",
                          }}
                        >
                          #{index + 1} {row.business_name || row.location_name || "QR Location"}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "rgba(255,255,255,0.68)",
                            lineHeight: 1.5,
                            wordBreak: "break-word",
                          }}
                        >
                          {row.address || "No address"}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "8px 12px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                          ...bandPillStyles(row.performance_band),
                        }}
                      >
                        {bandLabel(row.performance_band)}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.58)" }}>
                          Scans
                        </div>
                        <div style={{ fontWeight: 800 }}>{formatNumber(row.total_scans)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.58)" }}>
                          Signups
                        </div>
                        <div style={{ fontWeight: 800 }}>{formatNumber(row.total_signups)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.58)" }}>
                          Subs
                        </div>
                        <div style={{ fontWeight: 800 }}>
                          {formatNumber(row.total_subscriptions)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "22px",
              padding: "24px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9bbcff",
                marginBottom: "14px",
              }}
            >
              Stalled Locations
            </div>

            {stalledLocations.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.72)", fontSize: "15px", lineHeight: 1.6 }}>
                No stalled locations found right now.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {stalledLocations.map((row, index) => (
                  <div
                    key={`${row.location_key}-stalled-${index}`}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "16px",
                      background: "rgba(255,255,255,0.045)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        alignItems: "flex-start",
                        marginBottom: "8px",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: "15px",
                            marginBottom: "4px",
                            wordBreak: "break-word",
                          }}
                        >
                          {row.business_name || row.location_name || "QR Location"}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "rgba(255,255,255,0.68)",
                            lineHeight: 1.5,
                            wordBreak: "break-word",
                          }}
                        >
                          {row.address || "No address"}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: "8px 12px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                          ...bandPillStyles("stalled"),
                        }}
                      >
                        Stalled
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px",
                        fontSize: "13px",
                        color: "rgba(255,255,255,0.76)",
                      }}
                    >
                      <span>Site: {row.station_group_id || row.location_key || "—"}</span>
                      <span>Campaign: {row.campaign || "—"}</span>
                      <span>QRs: {formatNumber(row.qr_count)}</span>
                      <span>Placed: {formatNumber(row.placed_qr_count)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx global>{`
        .leaflet-container {
          font-family: inherit;
          background: #0b1728;
        }

        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {
          box-shadow: 0 18px 40px rgba(2, 8, 23, 0.28);
        }

        .leaflet-control-zoom a {
          color: #0f172a !important;
        }

        .ssc-pin-icon {
          background: transparent !important;
          border: 0 !important;
        }

        .ssc-cluster-icon {
          background: transparent !important;
          border: 0 !important;
        }
      `}</style>

      <style jsx>{`
        @media (max-width: 1180px) {
          .pill-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .pill-grid-secondary {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .top-grid,
          .bottom-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 780px) {
          main {
            padding: 24px 14px 44px !important;
          }

          .dashboard-title {
            font-size: 28px !important;
          }

          .dashboard-header {
            align-items: stretch !important;
          }

          .hero-actions {
            flex-direction: column;
          }

          .hero-action-link,
          .signout-button {
            width: 100%;
            text-align: center;
            box-sizing: border-box;
          }

          .filter-grid {
            grid-template-columns: 1fr !important;
          }

          .pill-grid,
          .pill-grid-secondary {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 520px) {
          .dashboard-title {
            font-size: 24px !important;
          }
        }
      `}</style>
    </main>
  );
}
