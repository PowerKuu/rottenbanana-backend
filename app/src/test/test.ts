import { scrapers } from "@/server/scraper/scrapers"
import { pipeline } from '@huggingface/transformers';

async function test() {
    const segmenter = await pipeline('background-removal', 'onnx-community/BEN2-ONNX');
    const url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/woman-with-afro_medium.jpg';
    const output = await segmenter(url);
    output[0].save('mask.png');
}

test().catch(console.error);