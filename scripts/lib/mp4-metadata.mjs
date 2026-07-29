import { readFile } from 'node:fs/promises';

function boxes(buffer, start, end) {
  const result = [];
  let cursor = start;
  while (cursor + 8 <= end) {
    let size = buffer.readUInt32BE(cursor);
    const type = buffer.toString('ascii', cursor + 4, cursor + 8);
    let headerSize = 8;
    if (size === 1 && cursor + 16 <= end) {
      size = Number(buffer.readBigUInt64BE(cursor + 8));
      headerSize = 16;
    } else if (size === 0) {
      size = end - cursor;
    }
    if (!Number.isFinite(size) || size < headerSize || cursor + size > end) break;
    result.push({ type, start: cursor, dataStart: cursor + headerSize, end: cursor + size, size });
    cursor += size;
  }
  return result;
}

function child(buffer, parent, type) {
  return boxes(buffer, parent.dataStart, parent.end).find((box) => box.type === type) ?? null;
}

function fullBoxTime(buffer, box) {
  if (!box || box.dataStart + 20 > box.end) return { timescale: null, duration: null };
  const version = buffer.readUInt8(box.dataStart);
  if (version === 1) {
    if (box.dataStart + 32 > box.end) return { timescale: null, duration: null };
    return { timescale: buffer.readUInt32BE(box.dataStart + 20), duration: Number(buffer.readBigUInt64BE(box.dataStart + 24)) };
  }
  return { timescale: buffer.readUInt32BE(box.dataStart + 12), duration: buffer.readUInt32BE(box.dataStart + 16) };
}

export function parseMp4Metadata(buffer) {
  const moov = boxes(buffer, 0, buffer.length).find((box) => box.type === 'moov');
  if (!moov) throw new Error('MP4 moov box was not found.');
  const movieTime = fullBoxTime(buffer, child(buffer, moov, 'mvhd'));
  const tracks = boxes(buffer, moov.dataStart, moov.end).filter((box) => box.type === 'trak');
  let selected = null;
  for (const trak of tracks) {
    const tkhd = child(buffer, trak, 'tkhd');
    const mdia = child(buffer, trak, 'mdia');
    if (!tkhd || !mdia) continue;
    const hdlr = child(buffer, mdia, 'hdlr');
    const handlerType = hdlr && hdlr.dataStart + 12 <= hdlr.end ? buffer.toString('ascii', hdlr.dataStart + 8, hdlr.dataStart + 12) : null;
    const width = tkhd.end - 8 >= tkhd.dataStart ? buffer.readUInt32BE(tkhd.end - 8) / 65536 : 0;
    const height = tkhd.end - 4 >= tkhd.dataStart ? buffer.readUInt32BE(tkhd.end - 4) / 65536 : 0;
    if (handlerType !== 'vide' && !(width > 0 && height > 0)) continue;
    const mediaTime = fullBoxTime(buffer, child(buffer, mdia, 'mdhd'));
    const minf = child(buffer, mdia, 'minf');
    const stbl = minf ? child(buffer, minf, 'stbl') : null;
    const stts = stbl ? child(buffer, stbl, 'stts') : null;
    let sampleCount = 0;
    let sampleDuration = 0;
    if (stts && stts.dataStart + 8 <= stts.end) {
      const entryCount = buffer.readUInt32BE(stts.dataStart + 4);
      let offset = stts.dataStart + 8;
      for (let index = 0; index < entryCount && offset + 8 <= stts.end; index += 1, offset += 8) {
        const count = buffer.readUInt32BE(offset);
        const delta = buffer.readUInt32BE(offset + 4);
        sampleCount += count;
        sampleDuration += count * delta;
      }
    }
    selected = { width, height, mediaTime, sampleCount, sampleDuration };
    break;
  }
  if (!selected) throw new Error('MP4 video track metadata was not found.');
  const movieDurationSeconds = movieTime.timescale && movieTime.duration ? movieTime.duration / movieTime.timescale : null;
  const mediaDurationSeconds = selected.mediaTime.timescale && selected.mediaTime.duration ? selected.mediaTime.duration / selected.mediaTime.timescale : null;
  const sampleDurationSeconds = selected.mediaTime.timescale && selected.sampleDuration ? selected.sampleDuration / selected.mediaTime.timescale : null;
  const frameRate = selected.sampleCount && (sampleDurationSeconds || mediaDurationSeconds)
    ? selected.sampleCount / (sampleDurationSeconds || mediaDurationSeconds)
    : null;
  const durationSeconds = movieDurationSeconds || mediaDurationSeconds;
  return {
    width: Math.round(selected.width) || null,
    height: Math.round(selected.height) || null,
    durationSeconds: durationSeconds ? Number(durationSeconds.toFixed(6)) : null,
    frameRate: frameRate ? Number(frameRate.toFixed(6)) : null,
    bitrateKbps: durationSeconds ? Number(((buffer.length * 8) / durationSeconds / 1000).toFixed(2)) : null,
    inspectionNote: 'Parsed generically from local ISO BMFF/MP4 moov, mvhd, trak/tkhd, mdhd and stts boxes; bitrate is the exact file-size average. Bundled Playwright ffmpeg was retained as the first probe but its stripped build could not demux these MP4 inputs.',
  };
}

export async function readMp4Metadata(filePath) {
  return parseMp4Metadata(await readFile(filePath));
}
