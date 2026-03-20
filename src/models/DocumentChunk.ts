import mongoose, { Document, Schema } from 'mongoose';

/**
 * Document chunk metadata interface
 */
export interface IDocumentMetadata {
  clearance_level: number;
  document_id: string;
  source: string;
  chunk_index: number;
  created_at: Date;
}

/**
 * Document chunk interface
 */
export interface IDocumentChunk extends Document {
  content: string;
  embedding: number[];
  metadata: IDocumentMetadata;
}

/**
 * Document chunk schema definition
 */
const DocumentChunkSchema = new Schema<IDocumentChunk>({
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true
  },
  embedding: {
    type: [Number],
    required: [true, 'Embedding vector is required'],
    validate: {
      validator: function(v: number[]) {
        return v.length === 3072; // Google Gemini gemini-embedding-001 dimension
      },
      message: 'Embedding must be a 3072-dimensional vector'
    }
  },
  metadata: {
    clearance_level: {
      type: Number,
      required: [true, 'Clearance level is required'],
      min: [1, 'Clearance level must be at least 1'],
      max: [3, 'Clearance level cannot exceed 3']
    },
    document_id: {
      type: String,
      required: [true, 'Document ID is required']
    },
    source: {
      type: String,
      required: [true, 'Source is required']
    },
    chunk_index: {
      type: Number,
      required: [true, 'Chunk index is required'],
      min: [0, 'Chunk index must be non-negative']
    },
    created_at: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  collection: 'document_chunks'
});

// Indexes for performance and vector search
DocumentChunkSchema.index({ 'metadata.clearance_level': 1 });
DocumentChunkSchema.index({ 'metadata.document_id': 1 });
DocumentChunkSchema.index({ 'metadata.source': 1 });

// Compound index for clearance-based filtering
DocumentChunkSchema.index({ 
  'metadata.clearance_level': 1, 
  'metadata.document_id': 1 
});

/**
 * Document chunk model
 */
export const DocumentChunk = mongoose.model<IDocumentChunk>('DocumentChunk', DocumentChunkSchema);
