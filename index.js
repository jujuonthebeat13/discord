require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  Events
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// 👉 IDs des rôles créatifs autorisés
const CREATIVE_ROLE_IDS = [
  "1458140072221343846",
  "1458284994345570538",
  "1458140485393842207",
  "1458140400559722558",
  "1458285431165554910",
  "1458285481417638020",
  "1458285599101288559",
  "1458285657423085764"

];

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const command = new SlashCommandBuilder()
    .setName("find-collab")
    .setDescription("Find members by creative role");

  // ⚡ Ici on utilise un serveur spécifique
  const guildId = "1458135503974170788"; // ton server ID
  const guild = client.guilds.cache.get(guildId);
  if (guild) {
    await guild.commands.create(command);
    console.log("✅ Command registered for guild");
  } else {
    console.log("❌ Guild not found");
  }
});

client.on(Events.InteractionCreate, async interaction => {
  // Slash command
  if (interaction.isChatInputCommand() && interaction.commandName === "find-collab") {
    const roles = CREATIVE_ROLE_IDS
      .map(id => interaction.guild.roles.cache.get(id))
      .filter(Boolean)
      .map(role => ({
        label: role.name,
        value: role.id
      }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("select-role")
      .setPlaceholder("Select a creative role")
      .addOptions(roles);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: "Select a role to see available members:",
      components: [row],
      ephemeral: true
    });
  }

  // Select menu
  if (interaction.isStringSelectMenu() && interaction.customId === "select-role") {
    const roleId = interaction.values[0];
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role)
      return interaction.update({ content: "❌ Role not found", components: [] });

    // ⚡ Fetch tous les membres du serveur pour remplir role.members
    await interaction.guild.members.fetch();

    // Maintenant role.members contient tous les membres du rôle
    const members = role.members
      .map(m => m.user.username)
      .sort((a, b) => a.localeCompare(b));

    const output =
      members.length > 0
        ? members.slice(0, 15).map(n => `• ${n}`).join("\n")
        : "_No members found._";

    await interaction.update({
      content: `**${role.name} — Available members:**\n${output}`,
      components: []
    });
  }
});

client.login(process.env.DISCORD_TOKEN);