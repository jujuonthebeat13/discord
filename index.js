const { Client, GatewayIntentBits, SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, Events, EmbedBuilder } = require("discord.js");

// Crée le client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers // nécessaire pour récupérer les membres
  ]
});

// ⚡ IDs des rôles créatifs autorisés
const CREATIVE_ROLE_IDS = [
  "1458140072221343846", // Musician
  "1458284994345570538", // Sound Engineer
  "1458140485393842207", // Graphic Designer
  "1458140400559722558", // Game Dev
  "1458285431165554910", // VFX
  "1458285481417638020", // Animation
  "1458285599101288559", // Video
  "1458285657423085764"  // Photo
];

// ⚡ ID du serveur où tu veux déployer la commande slash
const GUILD_ID = "1458135503974170788"; 

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    // Récupère le serveur
    const guild = await client.guilds.fetch(GUILD_ID);

    // Crée la commande slash pour ce serveur
    const command = new SlashCommandBuilder()
      .setName("find-collab")
      .setDescription("Find members by creative role");

    await guild.commands.create(command);
    console.log("✅ Command registered for guild");
  } catch (err) {
    console.error("❌ Error registering command:", err);
  }
});

// ⚡ Interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
  // Slash command
  if (interaction.isChatInputCommand() && interaction.commandName === "find-collab") {
    const roles = CREATIVE_ROLE_IDS
      .map((id) => interaction.guild.roles.cache.get(id))
      .filter(Boolean)
      .map((role) => ({ label: role.name, value: role.id }));

    if (roles.length === 0) {
      return interaction.reply({ content: "❌ No roles found!", ephemeral: true });
    }

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

    if (!role) return interaction.update({ content: "❌ Role not found", components: [] });

    // Fetch tous les membres du serveur pour que role.members soit à jour
    await interaction.guild.members.fetch();

    const members = role.members
      .map((m) => m.user.username)
      .sort((a, b) => a.localeCompare(b));

    const output = members.length > 0
      ? members.slice(0, 15).map((n) => `• ${n}`).join("\n")
      : "_No members found_";

    const embed = new EmbedBuilder()
      .setTitle(`${role.name} — Available members`)
      .setDescription(output)
      .setColor(0x1abc9c)
      .setFooter({ text: "Le Studio Bot" });

    await interaction.update({ embeds: [embed], components: [] });
  }
});

// ⚡ Connecte le bot à Discord via la variable d'environnement Railway
client.login(process.env.DISCORD_TOKEN);

