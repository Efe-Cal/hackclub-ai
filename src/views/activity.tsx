import type { DashboardRequestLog, Stats, User } from "../types";
import { EmptyState } from "./components/EmptyState";
import { Header } from "./components/Header";
import { StatCard } from "./components/StatCard";
import { Table } from "./components/Table";
import { Layout } from "./layout";

type ApiKeyFilter = { id: string; name: string };

type ActivityProps = {
  user: User;
  stats: Stats;
  recentLogs: DashboardRequestLog[];
  dailySpending?: number;
  apiKeys: ApiKeyFilter[];
  selectedApiKeyId: string | null;
};

export const Activity = ({
  user,
  stats,
  recentLogs,
  dailySpending,
  apiKeys,
  selectedApiKeyId,
}: ActivityProps) => {
  const selectedKeyName =
    apiKeys.find((k) => k.id === selectedApiKeyId)?.name ?? null;

  return (
    <Layout title="Activity" user={user}>
      <Header title="hackai" user={user} dailySpending={dailySpending} />

      <div class="w-full max-w-6xl mx-auto px-4 py-8">
        {apiKeys.length > 0 && (
          <div class="mb-8 flex flex-wrap items-center gap-3">
            <span class="text-sm font-medium text-brand-text">
              Filter by API key:
            </span>
            <form method="get" action="/activity" class="flex items-center gap-2">
              <select
                name="apiKeyId"
                aria-label="Filter by API key, auto-submits on selection"
                onchange="this.form.submit()"
                class="px-3 py-2 text-sm font-medium rounded-xl border-2 border-brand-border bg-brand-surface text-brand-text focus:border-brand-primary outline-none transition-colors"
              >
                <option value="" selected={!selectedApiKeyId}>
                  All keys
                </option>
                {apiKeys.map((key) => (
                  <option
                    value={key.id}
                    selected={key.id === selectedApiKeyId}
                  >
                    {key.name}
                  </option>
                ))}
              </select>
              <noscript>
                <button
                  type="submit"
                  class="px-4 py-2 text-sm font-medium rounded-xl bg-brand-primary text-white hover:bg-brand-primary-hover transition-all"
                >
                  Filter
                </button>
              </noscript>
            </form>
            {selectedApiKeyId && (
              <a
                href="/activity"
                class="text-sm font-medium text-brand-primary hover:underline"
              >
                Clear filter
              </a>
            )}
          </div>
        )}

        <h2 class="text-2xl font-bold mb-6 text-brand-heading">
          Usage Statistics
          {selectedKeyName && (
            <span class="ml-2 text-base font-normal text-brand-text">
              — {selectedKeyName}
            </span>
          )}
        </h2>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 mb-12">
          <StatCard
            value={stats.totalRequests?.toLocaleString() || 0}
            label="Total Requests"
          />
          <StatCard
            value={stats.totalTokens?.toLocaleString() || 0}
            label="Total Tokens"
          />
          <StatCard
            value={stats.totalPromptTokens?.toLocaleString() || 0}
            label="Prompt Tokens"
          />
          <StatCard
            value={stats.totalCompletionTokens?.toLocaleString() || 0}
            label="Completion Tokens"
          />
        </div>

        <h2 class="text-2xl font-bold mb-6 text-brand-heading">
          Recent Requests
        </h2>
        <RecentRequestsTable recentLogs={recentLogs} showApiKey={!selectedApiKeyId} />
      </div>
    </Layout>
  );
};

const RecentRequestsTable = ({
  recentLogs,
  showApiKey,
}: {
  recentLogs: DashboardRequestLog[];
  showApiKey: boolean;
}) => {
  if (recentLogs.length === 0) {
    return <EmptyState message="No requests yet." />;
  }

  return (
    <Table
      columns={[
        {
          header: "Time",
          render: (row) => {
            const diff = Math.floor(
              (Date.now() - new Date(row.timestamp).getTime()) / 1000,
            );
            if (diff < 60) return "just now";
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
            if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
            return new Date(row.timestamp).toLocaleDateString();
          },
        },
        { header: "Model", key: "model" },
        ...(showApiKey
          ? [
              {
                header: "API Key",
                render: (row: DashboardRequestLog) =>
                  row.apiKeyName ?? <span class="text-brand-text/40">—</span>,
              },
            ]
          : []),
        { header: "Tokens", render: (row) => row.totalTokens.toLocaleString() },
        { header: "Duration", render: (row) => `${row.duration}ms` },
        { header: "IP", key: "ip" },
      ]}
      data={recentLogs}
    />
  );
};
