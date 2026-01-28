import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Upload, File, Image, FileText, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FileAttachments({ entityType, entityId }) {
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: attachments = [] } = useQuery({
    queryKey: ["attachments", entityType, entityId],
    queryFn: () => base44.entities.FileAttachment.filter({ entity_type: entityType, entity_id: entityId }),
    enabled: !!entityId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FileAttachment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", entityType, entityId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FileAttachment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", entityType, entityId] });
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await createMutation.mutateAsync({
          file_name: file.name,
          file_url: file_url,
          file_type: file.type,
          file_size: file.size,
          entity_type: entityType,
          entity_id: entityId,
          uploaded_by: currentUser?.id
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith("image/")) return Image;
    if (fileType?.includes("pdf")) return FileText;
    return File;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || "Usuário";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Anexos</span>
          <label>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <Button size="sm" className="bg-[#355340] hover:bg-[#355340]/90" disabled={uploading} asChild>
              <span className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Upload
              </span>
            </Button>
          </label>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">Nenhum anexo</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((attachment) => {
              const FileIcon = getFileIcon(attachment.file_type);
              return (
                <div key={attachment.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <FileIcon className="h-5 w-5 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800 truncate">{attachment.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{formatFileSize(attachment.file_size)}</span>
                      <span>•</span>
                      <span>{getUserName(attachment.uploaded_by)}</span>
                      {attachment.created_date && (
                        <>
                          <span>•</span>
                          <span>{format(new Date(attachment.created_date), "dd/MM/yyyy")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                    {currentUser?.id === attachment.uploaded_by && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={() => deleteMutation.mutate(attachment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}