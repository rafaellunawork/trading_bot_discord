require("dotenv").config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require("discord.js");
const Binance = require("binance-api-node").default;

// =========================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const binance = Binance({
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET
});

// ====== SLASH COMMAND REGISTRATION ======
const commands = [
  new SlashCommandBuilder()
    .setName("price")
    .setDescription("Get current price")
    .addStringOption(option =>
      option.setName("symbol")
        .setDescription("Trading pair (e.g., BTCUSDT)")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Execute market buy order")
    .addStringOption(option =>
      option.setName("symbol")
        .setDescription("Trading pair (e.g., BTCUSDT)")
        .setRequired(true)
    )
    .addNumberOption(option =>
      option.setName("risk_percent")
        .setDescription("Risk % of USDT balance (e.g., 5)")
        .setRequired(true)
    )
].map(command => command.toJSON());

// ====== BOT READY ======
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ====== INTERACTION HANDLER ======
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    // ----- PRICE COMMAND -----
    if (commandName === "price") {
      const symbol = interaction.options.getString("symbol").toUpperCase();
      const ticker = await binance.prices({ symbol });

      await interaction.reply(`${symbol} Price: $${ticker[symbol]}`);
    }

    // ----- BUY COMMAND -----
    if (commandName === "buy") {
      const symbol = interaction.options.getString("symbol").toUpperCase();
      const riskPercent = interaction.options.getNumber("risk_percent");

      // Get USDT balance
      const accountInfo = await binance.accountInfo();
      const usdtBalance = accountInfo.balances.find(b => b.asset === "USDT").free;

      const tradeAmountUSDT = (usdtBalance * riskPercent) / 100;

      const order = await binance.order({
        symbol,
        side: "BUY",
        type: "MARKET",
        quoteOrderQty: tradeAmountUSDT
      });

      await interaction.reply(
        `Market BUY executed for ${symbol}\n` +
        `Used: $${tradeAmountUSDT}\n` +
        `Order ID: ${order.orderId}`
      );
    }

  } catch (error) {
    console.error(error);
    await interaction.reply("Error executing command. Check logs.");
  }
});

client.login(process.env.DISCORD_TOKEN);