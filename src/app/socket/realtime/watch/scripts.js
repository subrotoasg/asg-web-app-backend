import { redisConnection } from "../../../utlis/redis.js";
const MARK_ACTIVE_LUA = `
local now   = tonumber(ARGV[1])
local zttl  = tonumber(ARGV[2])
local httl  = tonumber(ARGV[3])
local limit = tonumber(ARGV[4])

local n = #ARGV
if n < 5 then return 0 end

local hllArgs = {}
for i = 5, n do
  hllArgs[#hllArgs + 1] = ARGV[i]
end

redis.call('PFADD', KEYS[2], unpack(hllArgs))
redis.call('EXPIRE', KEYS[2], httl)

local size = redis.call('ZCARD', KEYS[1])

if size < limit then
  local zargs = {}
  for i = 5, n do
    zargs[#zargs + 1] = now
    zargs[#zargs + 1] = ARGV[i]
  end
  redis.call('ZADD', KEYS[1], unpack(zargs))
  redis.call('EXPIRE', KEYS[1], zttl)

  -- meta hash এর TTL ও বাড়ানো হয়।
  -- না হলে ইউজার ভিডিও দেখতে থাকা অবস্থাতেই ৩০০ সেকেন্ড পর
  -- hash expire হয়ে avatar list খালি হয়ে যেত।
  --
  -- EXISTS চেক জরুরি: বড় রুমে meta রাখাই হয় না,
  -- সেখানে যেন খালি key তৈরি না হয়।
  if redis.call('EXISTS', KEYS[3]) == 1 then
    redis.call('EXPIRE', KEYS[3], zttl)
  end
end

return 1
`;

const ONLINE_COUNT_LUA = `
local cutoff = tonumber(ARGV[1])
local limit  = tonumber(ARGV[2])

redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, cutoff)

local size = redis.call('ZCARD', KEYS[1])

if size > 0 and size < limit then
  return { size, 1 }
end

local buckets = {}
for i = 2, #KEYS do
  buckets[#buckets + 1] = KEYS[i]
end

local approx = redis.call('PFCOUNT', unpack(buckets))

if approx < size then
  approx = size
end

return { approx, 0 }
`;

const SHOULD_EMIT_LUA = `
local prev = redis.call('GET', KEYS[1])
local cur  = tonumber(ARGV[1])

if prev then
  local diff = cur - tonumber(prev)
  if diff < 0 then diff = -diff end

  if diff < tonumber(ARGV[3]) then
    return 0
  end
end

redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[2]))
return 1
`;

let defined = false;

export function defineWatchCommands() {
  if (defined) {
    return;
  }

  redisConnection.defineCommand("watchMarkActive", {
    numberOfKeys: 3,
    lua: MARK_ACTIVE_LUA,
  });

  redisConnection.defineCommand("watchOnlineCount", {
    lua: ONLINE_COUNT_LUA,
  });

  redisConnection.defineCommand("watchShouldEmit", {
    numberOfKeys: 1,
    lua: SHOULD_EMIT_LUA,
  });

  defined = true;
}
