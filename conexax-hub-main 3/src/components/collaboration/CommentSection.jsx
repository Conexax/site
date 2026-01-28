import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, AtSign, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function CommentSection({ entityType, entityId }) {
  const [newComment, setNewComment] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", entityType, entityId],
    queryFn: () => base44.entities.Comment.filter({ entity_type: entityType, entity_id: entityId }),
    enabled: !!entityId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Comment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", entityType, entityId] });
      setNewComment("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Comment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", entityType, entityId] });
    },
  });

  const extractMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedUser = users.find(u => 
        u.full_name?.toLowerCase().includes(match[1].toLowerCase()) ||
        u.email?.toLowerCase().includes(match[1].toLowerCase())
      );
      if (mentionedUser) mentions.push(mentionedUser.id);
    }
    return mentions;
  };

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    const mentionedUsers = extractMentions(newComment);
    createMutation.mutate({
      content: newComment,
      entity_type: entityType,
      entity_id: entityId,
      mentioned_users: mentionedUsers,
      author_id: currentUser?.id
    });
  };

  const insertMention = (userName) => {
    setNewComment(prev => prev + `@${userName} `);
    setShowMentions(false);
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || "Usuário";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comentários</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Comments */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Nenhum comentário ainda</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-slate-800">
                        {getUserName(comment.author_id)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {comment.created_date && format(new Date(comment.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                  {currentUser?.id === comment.author_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-400 hover:text-red-600"
                      onClick={() => deleteMutation.mutate(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* New Comment */}
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Adicionar comentário... Use @ para mencionar usuários"
            rows={3}
            className="resize-none"
          />
          <div className="flex items-center gap-2">
            <Popover open={showMentions} onOpenChange={setShowMentions}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <AtSign className="h-4 w-4 mr-1" />
                  Mencionar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <div className="space-y-1">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => insertMention(user.full_name || user.email)}
                      className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100"
                    >
                      {user.full_name || user.email}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button 
              onClick={handleSubmit} 
              disabled={!newComment.trim() || createMutation.isPending}
              className="ml-auto bg-violet-600 hover:bg-violet-700"
            >
              <Send className="h-4 w-4 mr-1" />
              Enviar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}