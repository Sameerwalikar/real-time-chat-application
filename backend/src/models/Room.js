import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      // Group rooms should have a name, 1-to-1 chats will have a null/empty name in the DB
      // and are identified by their participants.
      required: function() {
        return this.isGroup;
      }
    },
    isGroup: {
      type: Boolean,
      default: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    avatar: {
      type: String,
      default: '',
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return this.isGroup;
      }
    },
    // Unique 6-digit join code for group rooms
    joinCode: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index on participants to optimize 1-to-1 room search
roomSchema.index({ participants: 1 });

// Virtual for quick member count
roomSchema.virtual('memberCount').get(function() {
  return Array.isArray(this.participants) ? this.participants.length : 0;
});

const Room = mongoose.model('Room', roomSchema);
export default Room;
