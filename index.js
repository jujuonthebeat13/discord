const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ModalBuilder,
  Events,
  EmbedBuilder
} = require("discord.js");

require("dotenv").config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// =============== CONFIG ===============
const GUILD_ID = "1458135503974170788"; // ton server ID
const MUSIC_THREAD_ID = "1461146580148158589"; // ton thread existant ID

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

const COLOR_OPTIONS = ["Red", "Blue", "Green", "Purple", "Orange"];

// =============== READY ===============
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const guild = await client.guilds.fetch(GUILD_ID);

  await guild.commands.set([
    new SlashCommandBuilder().setName("find-collab").setDescription("Find members by creative role"),
    new SlashCommandBuilder().setName("create-event").setDescription("Create an event post")
  ]);

  console.log("✅ Slash commands registered");
});

// =============== INTERACTIONS ===============
client.on(Events.InteractionCreate, async interaction => {

  // ----- /find-collab -----
  if (interaction.isChatInputCommand() && interaction.commandName === "find-collab") {
    const roles = CREATIVE_ROLE_IDS
      .map(id => interaction.guild.roles.cache.get(id))
      .filter(Boolean)
      .map(role => ({ label: role.name, value: role.id }));

    const optionsText = roles.map(r => `${r.label}`).join(", ");
    await interaction.reply({
      content: `Available creative roles: ${optionsText}`,
      ephemeral: true
    });
  }

  // ----- /create-event -----
  if (interaction.isChatInputCommand() && interaction.commandName === "create-event") {
    const modal = new ModalBuilder()
      .setCustomId("event-modal")
      .setTitle("Create Event");

    modal.addComponents(
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
          .setLabel("Event Description")
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
          .setLabel("Time (HH:MM, 24h)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
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
          .setLabel("Additional link (optional)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("image")
          .setLabel("Direct Image URL (optional)")
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

    await interaction.showModal(modal);
  }

  // ----- MODAL SUBMIT -----
  if (interaction.isModalSubmit() && interaction.customId === "event-modal") {
    const name = interaction.fields.getTextInputValue("name");
    const description = interaction.fields.getTextInputValue("description");
    const dateInput = interaction.fields.getTextInputValue("date");
    const timeInput = interaction.fields.getTextInputValue("time");
    const location = interaction.fields.getTextInputValue("location") || "TBA";
    const ticket = interaction.fields.getTextInputValue("ticket");
    const additional = interaction.fields.getTextInputValue("additional");
    const image = interaction.fields.getTextInputValue("image");
    const colorInput = interaction.fields.getTextInputValue("color");

    // Transform date dd/mm/yyyy → 12 December 2026
    const [d, m, y] = dateInput.split("/");
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const dateFormatted = `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;

    // Color
    const colorMap = { Red:0xD10C0C, Blue:0x3498DB, Green:0x2ECC71, Purple:0x9B59B6, Orange:0xE67E22 };
    const color = colorMap[colorInput] || 0xD10C0C;

    const embed = new EmbedBuilder()
      .setTitle(name)
      .setDescription(description)
      .setColor(color)
      .addFields(
        { name: "**📅 Date**", value: dateFormatted, inline:true },
        { name: "**⏰ Time**", value: timeInput, inline:true },
        { name: "**📍 Location**", value: location, inline:true }
      );

    if(ticket) embed.addFields({ name:"🎟 Get tickets here", value: ticket, inline:false });
    if(additional) embed.addFields({ name:"🔗 For more information", value: additional, inline:false });
    if(image) embed.setImage(image);

    // Post in existing thread
    const thread = await interaction.guild.channels.fetch(MUSIC_THREAD_ID);
    if(!thread || !thread.isThread()) return interaction.reply({ content:"❌ Thread not found", ephemeral:true });

    await thread.send({ embeds:[embed] });
    await interaction.reply({ content:`✅ Event posted in ${thread.name}`, ephemeral:true });
  }
});

// =============== LOGIN ===============
client.login(process.env.DISCORD_TOKEN);

