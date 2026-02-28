import * as Sentry from "@sentry/bun";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { apiKeys, requestLogs } from "../db/schema";
import {
  getApiKeyStats,
  getDailySpending,
  getUserStats,
} from "../lib/stats";
import { requireAuth } from "../middleware/auth";
import type { AppVariables } from "../types";
import { Activity } from "../views/activity";

const activity = new Hono<{ Variables: AppVariables }>();

activity.get("/activity", requireAuth, async (c) => {
  const user = c.get("user");
  const selectedApiKeyId = c.req.query("apiKeyId") || null;

  const [stats, recentLogs, dailySpending, userApiKeys] = await Promise.all([
    selectedApiKeyId
      ? getApiKeyStats(selectedApiKeyId, user.id)
      : getUserStats(user.id),
    Sentry.startSpan({ name: "db.select.recentLogs" }, () =>
      db
        .select({
          id: requestLogs.id,
          model: requestLogs.model,
          totalTokens: requestLogs.totalTokens,
          timestamp: requestLogs.timestamp,
          duration: requestLogs.duration,
          ip: requestLogs.ip,
          apiKeyName: apiKeys.name,
        })
        .from(requestLogs)
        .leftJoin(apiKeys, eq(requestLogs.apiKeyId, apiKeys.id))
        .where(
          selectedApiKeyId
            ? and(
                eq(requestLogs.userId, user.id),
                eq(requestLogs.apiKeyId, selectedApiKeyId),
              )
            : eq(requestLogs.userId, user.id),
        )
        .orderBy(desc(requestLogs.timestamp))
        .limit(50),
    ),
    getDailySpending(user.id),
    Sentry.startSpan({ name: "db.select.userApiKeys" }, () =>
      db
        .select({ id: apiKeys.id, name: apiKeys.name })
        .from(apiKeys)
        .where(and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)))
        .orderBy(desc(apiKeys.createdAt)),
    ),
  ]);

  return c.html(
    <Activity
      user={user}
      stats={stats}
      recentLogs={recentLogs}
      dailySpending={dailySpending}
      apiKeys={userApiKeys}
      selectedApiKeyId={selectedApiKeyId}
    />,
  );
});

export default activity;
