import coverBraidingSweetgrass from '../assets/images/cover_braiding_sweetgrass_1794718987577.jpg';
import coverDesignThings from '../assets/images/cover_design_things_1794718986036.jpg';
import coverDune from '../assets/images/cover_dune_1794718988126.jpg';
import coverMeditations from '../assets/images/cover_meditations_1794718987004.jpg';
import coverPiranesi from '../assets/images/cover_piranesi_1794718986505.jpg';
import { BookDraftInput, BookRecord } from '../types/book';

export const STARTER_BOOK_DRAFTS: BookDraftInput[] = [
  {
    title: 'Piranesi',
    author: 'Susanna Clarke',
    genre: 'Fiction',
    rating: 5,
    dateFinished: '2026-10',
    coverImage: coverPiranesi,
    keyTakeaway:
      'Attention and wonder are forms of resilience; how we choose to see our confinement determines who we remain inside it.',
    summary:
      'Piranesi lives in a boundless labyrinth of classical halls flooded by rhythmic ocean tides, dutifully cataloging statues and albatross nests in numbered journals. What initially reads like a quiet solitary diary gradually reveals a psychological mystery about memory, exploitation, and forgotten identity.\n\nWhat struck me most was how Piranesi’s reverence for the House protects his kindness even after his memories were fractured. Rather than bitterness, his meticulous observation becomes a way of preserving meaning.',
  },
  {
    title: 'The Design of Everyday Things',
    author: 'Don Norman',
    genre: 'Design & Art',
    rating: 5,
    dateFinished: '2026-09',
    coverImage: coverDesignThings,
    keyTakeaway:
      'When people struggle to use an everyday object, it is almost never human error—it is a failure of signifiers and conceptual models.',
    summary:
      'Norman breaks down why simple objects like doors, stoves, and switches either delight or frustrate us. He introduces core principles—affordances, signifiers, constraints, mapping, and feedback—to show how physical and digital interfaces communicate how they work without needing a manual.\n\nMy main takeaway is to observe friction with curiosity rather than blaming the user: if someone pushes a pull door, the handle sent the wrong visual signal.',
  },
  {
    title: 'Meditations',
    author: 'Marcus Aurelius',
    genre: 'Philosophy',
    rating: 5,
    dateFinished: '2026-08',
    coverImage: coverMeditations,
    keyTakeaway:
      'You have power over your mind—not outside events. Realize this, and you will find strength.',
    summary:
      'Written as private notes to himself rather than a public treatise, Marcus Aurelius repeatedly reminds himself to stay grounded amidst political betrayal, war, and mortality. The recurring discipline is separating an external event from the judgment we attach to it.\n\nReading it slowly shows that Stoicism is not emotional suppression; it is practicing perspective each morning so urgency and ego do not dictate your character.',
  },
  {
    title: 'Braiding Sweetgrass',
    author: 'Robin Wall Kimmerer',
    genre: 'Science & Nature',
    rating: 4,
    dateFinished: '2026-07',
    coverImage: coverBraidingSweetgrass,
    keyTakeaway:
      'Reciprocity transforms land from a resource we extract into a community we belong to.',
    summary:
      'Kimmerer weaves botanical science with Indigenous ecological wisdom to examine how gratitude and mutual care sustain ecosystems. Through essays on maple sugaring, moss, and wild strawberries, she contrasts a gift economy against purely extractive thinking.\n\nWhat stayed with me is the concept of the "honorable harvest"—taking only what is given, using it respectfully, and always giving something back to sustain the cycle.',
  },
  {
    title: 'Dune',
    author: 'Frank Herbert',
    genre: 'Sci-Fi & Fantasy',
    rating: 4,
    dateFinished: '2026-06',
    coverImage: coverDune,
    keyTakeaway:
      'Charismatic messianic narratives often conceal ecological and political machinery that outgrows their leaders.',
    summary:
      'Set on the desert planet Arrakis, Dune follows Paul Atreides as political intrigue, desert ecology, and engineered mythologies collide around the spice melange. Beneath the adventure plot, Herbert builds an intricate study of water scarcity, religion as statecraft, and the danger of surrendering critical judgment to heroes.\n\nI appreciated how every faction—from the Fremen to the Spacing Guild—is shaped by the constraints of energy and water.',
  },
];

export function buildSampleBooks(): BookRecord[] {
  const now = Date.now();
  return STARTER_BOOK_DRAFTS.map((draft, index) => ({
    id: `sample-${index + 1}`,
    ownerId: 'preview-reader',
    ...draft,
    createdAtMs: now - index * 86400000,
    updatedAtMs: now - index * 86400000,
    isSample: true,
  }));
}
