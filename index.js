const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  Events, 
  EmbedBuilder 
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// ================= CONFIG =================
const GUILD_ID = "1458135503974170788"; // Ton serveur
const MUSIC_THREAD_ID = "1461146580148158589"; // Fil/forum existant

const CREATIVE_ROLE_IDS = [
  "1458140072221343846", // Musician
  "1458284994345570538", // Sound
  "1458140485393842207", // Design
  "1458140400559722558", // Game Dev
  "1458285431165554910", // VFX
  "1458285481417638020", // Animation
  "1458285599101288559", // Video
  "1458285657423085764"  // Photo
];

const COLOR_OPTIONS = [
  { label: "Red", value: "D10C0C", color: 0xD10C0C },
  { label: "Blue", value: "3498DB", color: 0x3498DB },
  { label: "Green", value: "2ECC71", color: 0x2ECC71 },
  { label: "Purple", value: "9B59B6", color: 0x9B59B6 },
  { label: "Orange", value: "E67E22", color: 0xE67E22 }
];

// ================= READY =================
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  const guild = await client.guilds.fetch(GUILD_ID);

  await guild.commands.set([
    new SlashCommandBuilder()
      .setName("find-collab")
      .setDescription("Find members by creative role"),
    new SlashCommandBuilder()
      .setName("create-event")
      .setDescription("Create a music event post")
  ]);

  console.log("✅ Slash commands registered");
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async interaction => {

  // ---------- /find-collab ----------
  if (interaction.isChatInputCommand() && interaction.commandName === "find-collab") {
    const roles = CREATIVE_ROLE_IDS
      .map(id => interaction.guild.roles.cache.get(id))
      .filter(Boolean)
      .map(role => ({ label: role.name, value: role.id }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("select-role")
      .setPlaceholder("Select a creative role")
      .addOptions(roles);

    await interaction.reply({
      content: "Select a role to see available members:",
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true
    });
  }

  // ---------- ROLE SELECT ----------
  if (interaction.isStringSelectMenu() && interaction.customId === "select-role") {
    await interaction.guild.members.fetch();
    const role = interaction.guild.roles.cache.get(interaction.values[0]);
    if (!role) return;

    const members = role.members.map(m => `<@${m.user.id}>`);
    const embed = new EmbedBuilder()
      .setTitle(`${role.name} — Available members`)
      .setDescription(members.length ? members.slice(0, 20).join("\n") : "_No members found_")
      .setColor(0x1abc9c);

    await interaction.update({ embeds: [embed], components: [] });
  }

  // ---------- /create-event ----------
  if (interaction.isChatInputCommand() && interaction.commandName === "create-event") {
    const modal1 = new ModalBuilder()
      .setCustomId("event-step1")
      .setTitle("Create Music Event - Step 1");

    modal1.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("name")
          .setLabel("Event Name")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Description")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("date")
          .setLabel("Date (dd/mm/yyyy)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("time")
          .setLabel("Time (24h format)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal1);
  }

  // ---------- STEP 1 SUBMIT ----------
  if (interaction.isModalSubmit() && interaction.customId === "event-step1") {
    const step1Data = {
      name: interaction.fields.getTextInputValue("name"),
      description: interaction.fields.getTextInputValue("description"),
      date: interaction.fields.getTextInputValue("date"),
      time: interaction.fields.getTextInputValue("time")
    };

    // Stocker temporairement les données de step1 dans l'interaction (ou base simple)
    interaction.client.tempEventData = interaction.client.tempEventData || {};
    interaction.client.tempEventData[interaction.user.id] = step1Data;

    // Step 2 modal
    const modal2 = new ModalBuilder()
      .setCustomId("event-step2")
      .setTitle("Create Music Event - Step 2");

    modal2.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("location")
          .setLabel("Location")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("ticket")
          .setLabel("Ticket link (optional)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("additional")
          .setLabel("Additional links (optional)")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("image")
          .setLabel("Image URL (direct link)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("color")
          .setLabel("Color (Red, Blue, Green, Purple, Orange) or leave blank")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      )
    );

    await interaction.showModal(modal2);
  }

  // ---------- STEP 2 SUBMIT ----------
  if (interaction.isModalSubmit() && interaction.customId === "event-step2") {
    const step1Data = interaction.client.tempEventData?.[interaction.user.id];
    if (!step1Data) {
      return interaction.reply({ content: "❌ Step 1 data not found. Please retry.", ephemeral: true });
    }

    const location = interaction.fields.getTextInputValue("location") || "TBA";
    const ticket = interaction.fields.getTextInputValue("ticket");
    const additional = interaction.fields.getTextInputValue("additional");
    const image = interaction.fields.getTextInputValue("image");
    const colorInput = interaction.fields.getTextInputValue("color");

    // Couleur par défaut si vide
    let color = 0xD10C0C;
    if (colorInput) {
      const match = COLOR_OPTIONS.find(c => c.label.toLowerCase() === colorInput.trim().toLowerCase());
      if (match) color = match.color;
    }

    // Formater date en texte
    let formattedDate = step1Data.date;
    try {
      const [dd, mm, yyyy] = step1Data.date.split("/");
      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      formattedDate = `${parseInt(dd)} ${monthNames[parseInt(mm)-1]} ${yyyy}`;
    } catch {}

    const embed = new EmbedBuilder()
      .setTitle(step1Data.name)
      .setDescription(step1Data.description)
      .setColor(color)
      .addFields(
        { name: "📅 Date", value: formattedDate, inline: true },
        { name: "⏰ Time", value: step1Data.time, inline: true },
        { name: "📍 Location", value: location, inline: true },
        { name: "🎟 Ticket", value: ticket ? `[Get tickets here](${ticket})` : "—", inline: true },
        { name: "🔗 Additional links", value: additional ? `[For more info](${additional})` : "—", inline: false }
      )
      .setFooter({ text: `Posted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    if (image) embed.setImage(image);

    // Envoyer dans le thread existant
    const thread = await interaction.guild.channels.fetch(MUSIC_THREAD_ID);
    if (!thread || !thread.isThread()) {
      return interaction.reply({ content: "❌ Music thread not found", ephemeral: true });
    }

    await thread.send({ embeds: [embed] });
    delete interaction.client.tempEventData[interaction.user.id];

    await interaction.reply({ content: `✅ Event posted in ${thread.name}`, ephemeral: true });
  }
});

// ================= LOGIN =================
client.login(process.env.DISCORD_TOKEN);
