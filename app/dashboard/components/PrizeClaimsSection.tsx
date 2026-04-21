"use client";

import Link from "next/link";

export type PrizeClaimRow = {
  id: string;
  winnerMonth: string | null;
  label: string;
  basePrizeAmount: number;
  totalPrizeAmount: number;
  claimStatus: string;
  prizeMultiplier: number;
  showMultiplier: boolean;
  isClaimable: boolean;
};

function formatWinnerMonth(value: string | null) {
  if (!value) return "Unknown month";

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function getStatusStyles(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "paid") {
    return {
      background: "rgba(34,197,94,0.16)",
      color: "#86efac",
      border: "1px solid rgba(34,197,94,0.28)",
    };
  }

  if (normalized === "pending") {
    return {
      background: "rgba(245,158,11,0.16)",
      color: "#fcd34d",
      border: "1px solid rgba(245,158,11,0.28)",
    };
  }

  if (normalized === "approved") {
    return {
      background: "rgba(59,130,246,0.16)",
      color: "#93c5fd",
      border: "1px solid rgba(59,130,246,0.28)",
    };
  }

  return {
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(255,255,255,0.12)",
  };
}

function getLockedButtonLabel(status: string) {
  if (status === "Paid") return "Already Paid";
  if (status === "Pending") return "Pending";
  if (status === "Approved") return "Approved";
  return "Already Claimed";
}

export default function PrizeClaimsSection({
  prizes,
}: {
  prizes: PrizeClaimRow[];
}) {
  return (
    <section
      style={{
        width: "100%",
        marginTop: "28px",
      }}
    >
      <div
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.06)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "26px 20px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1800px",
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "22px",
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            Prize Claims
          </h2>

          <p
            style={{
              margin: "0 0 24px",
              color: "rgba(255,255,255,0.8)",
              fontSize: "15px",
              lineHeight: 1.6,
            }}
          >
            Your past winnings stay here as a record. Claim buttons are only active for
            unclaimed prizes.
          </p>

          {prizes.length === 0 ? (
            <div
              style={{
                color: "rgba(255,255,255,0.72)",
                fontSize: "15px",
                lineHeight: 1.6,
              }}
            >
              No prize records yet.
            </div>
          ) : (
            <>
              <div className="claims-table-wrapper">
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "1120px",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={headerCellStyle}>MONTH</th>
                      <th style={headerCellStyle}>PRIZE</th>
                      <th style={headerCellStyle}>BASE PRIZE</th>
                      <th style={headerCellStyle}>MULTIPLIER</th>
                      <th style={headerCellStyle}>TOTAL WON</th>
                      <th style={headerCellStyle}>STATUS</th>
                      <th style={headerCellStyle}>ACTION</th>
                    </tr>
                  </thead>

                  <tbody>
                    {prizes.map((prize) => {
                      const statusStyles = getStatusStyles(prize.claimStatus);

                      return (
                        <tr
                          key={prize.id}
                          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                        >
                          <td style={bodyCellStyle}>{formatWinnerMonth(prize.winnerMonth)}</td>
                          <td style={bodyCellStyle}>{prize.label}</td>
                          <td style={bodyCellStyle}>{formatCurrency(prize.basePrizeAmount)}</td>
                          <td style={bodyCellStyle}>
                            {prize.showMultiplier ? `${prize.prizeMultiplier}x` : "—"}
                          </td>
                          <td style={bodyCellStyle}>{formatCurrency(prize.totalPrizeAmount)}</td>
                          <td style={bodyCellStyle}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: "80px",
                                padding: "8px 14px",
                                borderRadius: "999px",
                                fontSize: "13px",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                                ...statusStyles,
                              }}
                            >
                              {prize.claimStatus}
                            </span>
                          </td>
                          <td style={bodyCellStyle}>
                            {prize.isClaimable ? (
                              <Link
                                href={`/dashboard/claim-prize?winner=${encodeURIComponent(prize.id)}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minWidth: "122px",
                                  padding: "12px 18px",
                                  borderRadius: "999px",
                                  textDecoration: "none",
                                  fontWeight: 800,
                                  fontSize: "15px",
                                  background: "#ffffff",
                                  color: "#07111f",
                                }}
                              >
                                Claim Prize
                              </Link>
                            ) : (
                              <button
                                type="button"
                                disabled
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minWidth: "122px",
                                  padding: "12px 18px",
                                  borderRadius: "999px",
                                  fontWeight: 800,
                                  fontSize: "15px",
                                  background: "rgba(255,255,255,0.08)",
                                  color: "rgba(255,255,255,0.55)",
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  cursor: "not-allowed",
                                }}
                              >
                                {getLockedButtonLabel(prize.claimStatus)}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="claims-mobile-list">
                {prizes.map((prize) => {
                  const statusStyles = getStatusStyles(prize.claimStatus);

                  return (
                    <div
                      key={prize.id}
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        padding: "16px 0",
                        display: "grid",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "16px",
                              fontWeight: 800,
                              color: "#ffffff",
                              marginBottom: "4px",
                            }}
                          >
                            {prize.label}
                          </div>
                          <div
                            style={{
                              color: "rgba(255,255,255,0.72)",
                              fontSize: "14px",
                            }}
                          >
                            {formatWinnerMonth(prize.winnerMonth)}
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: "16px",
                            fontWeight: 800,
                            color: "#ffffff",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatCurrency(prize.totalPrizeAmount)}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "8px 14px",
                            borderRadius: "999px",
                            fontSize: "13px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            ...statusStyles,
                          }}
                        >
                          {prize.claimStatus}
                        </span>

                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "8px 14px",
                            borderRadius: "999px",
                            fontSize: "13px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            background: "rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.85)",
                            border: "1px solid rgba(255,255,255,0.12)",
                          }}
                        >
                          Base {formatCurrency(prize.basePrizeAmount)}
                        </span>

                        {prize.showMultiplier ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "8px 14px",
                              borderRadius: "999px",
                              fontSize: "13px",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              background: "rgba(255,255,255,0.08)",
                              color: "rgba(255,255,255,0.85)",
                              border: "1px solid rgba(255,255,255,0.12)",
                            }}
                          >
                            {prize.prizeMultiplier}x multiplier
                          </span>
                        ) : null}
                      </div>

                      {prize.isClaimable ? (
                        <Link
                          href={`/dashboard/claim-prize?winner=${encodeURIComponent(prize.id)}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "12px 18px",
                            borderRadius: "999px",
                            textDecoration: "none",
                            fontWeight: 800,
                            fontSize: "15px",
                            background: "#ffffff",
                            color: "#07111f",
                          }}
                        >
                          Claim Prize
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "12px 18px",
                            borderRadius: "999px",
                            fontWeight: 800,
                            fontSize: "15px",
                            background: "rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.55)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            cursor: "not-allowed",
                          }}
                        >
                          {getLockedButtonLabel(prize.claimStatus)}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .claims-mobile-list {
          display: none;
        }

        @media (max-width: 980px) {
          .claims-table-wrapper {
            display: none;
          }

          .claims-mobile-list {
            display: block;
          }
        }

        @media (max-width: 700px) {
          section {
            margin-top: 20px !important;
          }
        }
      `}</style>
    </section>
  );
}

const headerCellStyle: React.CSSProperties = {
  textAlign: "left",
  color: "#8fb7ff",
  fontSize: "14px",
  fontWeight: 800,
  padding: "10px 0 16px",
};

const bodyCellStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "15px",
  padding: "20px 0",
  verticalAlign: "middle",
};
